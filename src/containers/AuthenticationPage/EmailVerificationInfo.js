import React from 'react';

import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { formatPromoLastDay } from '../../util/promo';

import { Heading, NamedLink, IconEmailSent, InlineTextButton, IconClose } from '../../components';

import css from './AuthenticationPage.module.css';

// "What next" step after sign-up while a promotion runs: a visitor who arrived from an
// ad is most motivated right now, so point them at their first listing.
const PromoNextStep = ({ promo, marketplaceName }) => {
  const intl = useIntl();
  const date = formatPromoLastDay(intl, promo, 'long');
  const shortDate = formatPromoLastDay(intl, promo, 'short');

  return (
    <div className={css.promoNextStep}>
      <p className={css.promoNextKicker}>
        <FormattedMessage id="AuthenticationPage.promoNextKicker" values={{ date: shortDate }} />
      </p>
      <h2 className={css.promoNextTitle}>
        <FormattedMessage id="AuthenticationPage.promoNextTitle" />
      </h2>
      <p className={css.promoNextText}>
        <FormattedMessage
          id="AuthenticationPage.promoNextText"
          values={{ date, marketplaceName }}
        />
      </p>
      <div className={css.promoNextActions}>
        <NamedLink name="NewListingPage" className={css.promoNextPrimary}>
          <FormattedMessage id="AuthenticationPage.promoNextListLink" />
        </NamedLink>
        <NamedLink name="SearchPage" className={css.promoNextSecondary}>
          <FormattedMessage id="AuthenticationPage.promoNextBrowseLink" />
        </NamedLink>
      </div>
    </div>
  );
};

const EmailVerificationInfo = props => {
  const {
    name,
    email,
    onResendVerificationEmail,
    resendErrorMessage,
    sendVerificationEmailInProgress,
    promo,
    marketplaceName,
  } = props;

  const resendEmailLink = (
    <InlineTextButton rootClassName={css.modalHelperLink} onClick={onResendVerificationEmail}>
      <FormattedMessage id="AuthenticationPage.resendEmailLinkText" />
    </InlineTextButton>
  );

  const fixEmailLink = (
    <NamedLink className={css.modalHelperLink} name="ContactDetailsPage">
      <FormattedMessage id="AuthenticationPage.fixEmailLinkText" />
    </NamedLink>
  );

  return (
    <div className={css.content}>
      <NamedLink className={css.verifyClose} name="ProfileSettingsPage">
        <span className={css.closeText}>
          <FormattedMessage id="AuthenticationPage.verifyEmailClose" />
        </span>
        <IconClose rootClassName={css.closeIcon} />
      </NamedLink>
      <IconEmailSent className={css.modalIcon} />
      <Heading as="h1" rootClassName={css.modalTitle}>
        <FormattedMessage id="AuthenticationPage.verifyEmailTitle" values={{ name }} />
      </Heading>
      <p className={css.modalMessage}>
        <FormattedMessage id="AuthenticationPage.verifyEmailText" values={{ email }} />
      </p>
      {resendErrorMessage}

      <div className={css.bottomWrapper}>
        <p className={css.modalHelperText}>
          {sendVerificationEmailInProgress ? (
            <FormattedMessage id="AuthenticationPage.sendingEmail" />
          ) : (
            <FormattedMessage id="AuthenticationPage.resendEmail" values={{ resendEmailLink }} />
          )}
        </p>
        <p className={css.modalHelperText}>
          <FormattedMessage id="AuthenticationPage.fixEmail" values={{ fixEmailLink }} />
        </p>
      </div>

      {promo ? <PromoNextStep promo={promo} marketplaceName={marketplaceName} /> : null}
    </div>
  );
};

export default EmailVerificationInfo;
