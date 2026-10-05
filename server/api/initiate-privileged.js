const sharetribeSdk = require('sharetribe-flex-sdk');
const { transactionLineItems } = require('../api-util/lineItems');
const { isIntentionToMakeOffer } = require('../api-util/negotiation');
const priceOffers = require('../api-util/priceOffers');
const {
  createCookieTokenStore,
  getSdk,
  getTrustedSdk,
  handleError,
  serialize,
  fetchCommission,
} = require('../api-util/sdk');

const { Money } = sharetribeSdk.types;

const listingPromise = (sdk, id, include) =>
  include ? sdk.listings.show({ id, include }) : sdk.listings.show({ id });

const getFullOrderData = (orderData, bodyParams, currency) => {
  const { offerInSubunits } = orderData || {};
  const transitionName = bodyParams.transition;

  return isIntentionToMakeOffer(offerInSubunits, transitionName)
    ? {
        ...orderData,
        ...bodyParams.params,
        currency,
        offer: new Money(offerInSubunits, currency),
      }
    : { ...orderData, ...bodyParams.params };
};

const getMetadata = (orderData, transition) => {
  const { actor, offerInSubunits } = orderData || {};
  // NOTE: for now, the actor is always "provider".
  const hasActor = ['provider', 'customer'].includes(actor);
  const by = hasActor ? actor : null;

  return isIntentionToMakeOffer(offerInSubunits, transition)
    ? {
        metadata: {
          offers: [
            {
              offerInSubunits,
              by,
              transition,
            },
          ],
        },
      }
    : {};
};

module.exports = (req, res) => {
  const { isSpeculative, orderData, bodyParams, queryParams } = req.body || {};
  const transitionName = bodyParams.transition;
  // Share one cookie token store so a refresh during listings.show is reused for exchangeToken.
  const tokenStore = createCookieTokenStore(req, res);
  const sdk = getSdk(req, res, tokenStore);
  let lineItems = null;
  let metadataMaybe = {};

  // Price offers (offer-purchase process) are validated and priced in priceOffers.js.
  const isPriceOffer =
    transitionName === priceOffers.BUYER_MAKE_OFFER ||
    priceOffers.isOfferPurchaseProcessAlias(bodyParams?.processAlias);

  Promise.all([
    listingPromise(
      sdk,
      bodyParams?.params?.listingId,
      isPriceOffer ? ['author', 'currentStock'] : null
    ),
    fetchCommission(sdk),
  ])
    .then(responses =>
      // Sequential: a token refresh during listings.show is then reused by this call.
      isPriceOffer
        ? sdk.currentUser.show().then(currentUserResponse => [...responses, currentUserResponse])
        : responses
    )
    .then(([showListingResponse, fetchAssetsResponse, currentUserResponse]) => {
      const listing = showListingResponse.data.data;
      const commissionAsset = fetchAssetsResponse.data.data[0];

      const currency = listing.attributes.price?.currency || orderData.currency;
      const { providerCommission, customerCommission } =
        commissionAsset?.type === 'jsonAsset' ? commissionAsset.attributes.data : {};

      if (isPriceOffer) {
        const offerParams = priceOffers.getInitiateParams({
          listing,
          stockQuantity: priceOffers.getStockQuantity(listing, showListingResponse.data.included),
          currentUser: currentUserResponse?.data?.data,
          orderData,
          bodyParams,
          commissions: { providerCommission, customerCommission },
        });
        lineItems = offerParams.lineItems;
        metadataMaybe = { metadata: offerParams.metadata };
        return getTrustedSdk(req, res, tokenStore);
      }

      lineItems = transactionLineItems(
        listing,
        getFullOrderData(orderData, bodyParams, currency),
        providerCommission,
        customerCommission
      );
      metadataMaybe = getMetadata(orderData, transitionName);

      return getTrustedSdk(req, res, tokenStore);
    })
    .then(trustedSdk => {
      const { params } = bodyParams;

      // Add lineItems to the body params
      const body = {
        ...bodyParams,
        params: {
          ...params,
          lineItems,
          ...metadataMaybe,
        },
      };

      if (isSpeculative) {
        return trustedSdk.transactions.initiateSpeculative(body, queryParams);
      }
      return trustedSdk.transactions.initiate(body, queryParams);
    })
    .then(apiResponse => {
      const { status, statusText, data } = apiResponse;
      res
        .status(status)
        .set('Content-Type', 'application/transit+json')
        .send(
          serialize({
            status,
            statusText,
            data,
          })
        )
        .end();
    })
    .catch(e => {
      handleError(res, e);
    });
};
