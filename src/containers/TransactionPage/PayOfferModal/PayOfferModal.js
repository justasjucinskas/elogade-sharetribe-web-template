import React from 'react';
import { Form as FinalForm } from 'react-final-form';

import { FormattedMessage, useIntl } from '../../../util/reactIntl';
import { types as sdkTypes } from '../../../util/sdkLoader';
import { formatMoney } from '../../../util/currency';
import { required } from '../../../util/validators';
import { displayDeliveryPickup, displayDeliveryShipping } from '../../../util/configHelpers';

import { FieldSelect, Form, Modal, PrimaryButton } from '../../../components';

import css from './PayOfferModal.module.css';

const { Money } = sdkTypes;

/**
 * Delivery methods the buyer can choose from, the same way ProductOrderForm offers them for "Buy".
 *
 * @param {Object} listing listing entity
 * @param {Object} listingTypeConfig listing type configuration
 * @returns {Array<'pickup'|'shipping'|'none'>}
 */
export const getDeliveryMethodOptions = (listing, listingTypeConfig) => {
  const { pickupEnabled, shippingEnabled } = listing?.attributes?.publicData || {};
  const hasPickup = !!(pickupEnabled && displayDeliveryPickup(listingTypeConfig));
  const hasShipping = !!(shippingEnabled && displayDeliveryShipping(listingTypeConfig));
  return hasPickup && hasShipping
    ? ['pickup', 'shipping']
    : hasShipping
    ? ['shipping']
    : hasPickup
    ? ['pickup']
    : ['none'];
};

/**
 * Price offers: before paying the agreed price, the buyer chooses the delivery method
 * (as with "Buy"). Only shown when the listing has more than one delivery method.
 *
 * @component
 * @param {Object} props
 * @param {string} props.id - The modal id
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {Function} props.onCloseModal - Closes the modal
 * @param {Function} props.onManageDisableScrolling - Scroll management for the modal
 * @param {Function} props.onSubmit - Called with { deliveryMethod }
 * @param {propTypes.listing} props.listing - The listing (for the shipping fee)
 * @param {string} [props.focusElementId] - The element to focus when the modal closes
 * @returns {JSX.Element}
 */
const PayOfferModal = props => {
  const intl = useIntl();
  const {
    id,
    isOpen,
    onCloseModal,
    onManageDisableScrolling,
    onSubmit,
    listing,
    focusElementId,
  } = props;

  const { shippingPriceInSubunitsOneItem } = listing?.attributes?.publicData || {};
  const currency = listing?.attributes?.price?.currency;
  const shippingFee =
    Number.isInteger(shippingPriceInSubunitsOneItem) && currency
      ? formatMoney(intl, new Money(shippingPriceInSubunitsOneItem, currency))
      : null;

  return (
    <Modal
      id={id}
      containerClassName={css.root}
      contentClassName={css.modalContent}
      isOpen={isOpen}
      onClose={onCloseModal}
      onManageDisableScrolling={onManageDisableScrolling}
      focusElementId={focusElementId}
      usePortal
    >
      <p className={css.modalTitle}>
        <FormattedMessage id="PayOfferModal.title" />
      </p>
      <p className={css.modalMessage}>
        <FormattedMessage id="PayOfferModal.description" />
      </p>
      <FinalForm
        onSubmit={onSubmit}
        render={({ handleSubmit, invalid }) => (
          <Form className={css.form} onSubmit={handleSubmit}>
            <FieldSelect
              id={`${id}.deliveryMethod`}
              className={css.deliveryField}
              name="deliveryMethod"
              label={intl.formatMessage({ id: 'ProductOrderForm.deliveryMethodLabel' })}
              validate={required(
                intl.formatMessage({ id: 'ProductOrderForm.deliveryMethodRequired' })
              )}
            >
              <option disabled value="">
                {intl.formatMessage({ id: 'ProductOrderForm.selectDeliveryMethodOption' })}
              </option>
              <option value="pickup">
                {intl.formatMessage({ id: 'ProductOrderForm.pickupOption' })}
              </option>
              <option value="shipping">
                {shippingFee
                  ? intl.formatMessage({ id: 'PayOfferModal.shippingOption' }, { shippingFee })
                  : intl.formatMessage({ id: 'ProductOrderForm.shippingOption' })}
              </option>
            </FieldSelect>
            <PrimaryButton className={css.submitButton} type="submit" disabled={invalid}>
              <FormattedMessage id="PayOfferModal.submit" />
            </PrimaryButton>
          </Form>
        )}
      />
    </Modal>
  );
};

export default PayOfferModal;
