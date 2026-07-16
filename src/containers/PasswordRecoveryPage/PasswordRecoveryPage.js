import React from 'react';
import { compose } from 'redux';
import { connect } from 'react-redux';
import { useLocation } from 'react-router-dom';
import classNames from 'classnames';

import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { propTypes } from '../../util/types';
import { isPasswordRecoveryEmailNotFoundError } from '../../util/errors';
import { isScrollingDisabled } from '../../ducks/ui.duck';
import { useReveal } from '../../hooks/useReveal';

import { Heading, Page, InlineTextButton, LayoutSingleColumn } from '../../components';

import TopbarContainer from '../../containers/TopbarContainer/TopbarContainer';
import FooterContainer from '../../containers/FooterContainer/FooterContainer';

import PasswordRecoveryForm from './PasswordRecoveryForm/PasswordRecoveryForm';

import {
  recoverPassword,
  retypePasswordRecoveryEmail,
  clearPasswordRecoveryError,
} from './PasswordRecoveryPage.duck';
import css from './PasswordRecoveryPage.module.css';

/**
 * The brand/marketing panel shown alongside the form — same immersive dark
 * treatment as the login/signup pages, with the reset flow spelled out as
 * three numbered steps.
 */
const BrandPanel = ({ intl }) => {
  const msg = id => intl.formatMessage({ id: `PasswordRecoveryPage.${id}` });

  return (
    <div className={css.brandPanel}>
      <h2 className={css.brandTitle}>
        {msg('brandTitleLead')}{' '}
        <span className={css.brandTitleAccent}>{msg('brandTitleAccent')}</span>
      </h2>
      <p className={css.brandSubtitle}>{msg('brandSubtitle')}</p>
      <ol className={css.brandSteps}>
        {['brandStep1', 'brandStep2', 'brandStep3'].map((key, i) => (
          <li key={key} className={css.brandStep}>
            <span className={css.brandStepBadge}>{i + 1}</span>
            {msg(key)}
          </li>
        ))}
      </ol>
    </div>
  );
};

const PasswordRecovery = props => {
  const { initialEmail, onChange, onSubmitEmail, recoveryInProgress, recoveryError } = props;
  return (
    <div className={css.content}>
      <Heading as="h1" rootClassName={css.cardTitle}>
        <FormattedMessage id="PasswordRecoveryPage.forgotPasswordTitle" />
      </Heading>
      <p className={css.cardMessage}>
        <FormattedMessage id="PasswordRecoveryPage.forgotPasswordMessage" />
      </p>
      <PasswordRecoveryForm
        inProgress={recoveryInProgress}
        onChange={onChange}
        onSubmit={values => onSubmitEmail(values.email)}
        initialValues={{ email: initialEmail }}
        recoveryError={recoveryError}
      />
    </div>
  );
};

const GenericError = () => {
  return (
    <div className={css.content}>
      <Heading as="h1" rootClassName={css.cardTitle}>
        <FormattedMessage id="PasswordRecoveryPage.actionFailedTitle" />
      </Heading>
      <p className={css.cardMessage}>
        <FormattedMessage id="PasswordRecoveryPage.actionFailedMessage" />
      </p>
    </div>
  );
};

const EmailSubmittedContent = props => {
  const {
    passwordRequested,
    initialEmail,
    submittedEmail,
    onRetypeEmail,
    onSubmitEmail,
    recoveryInProgress,
  } = props;

  const submittedEmailText = (
    <span className={css.email}>{passwordRequested ? initialEmail : submittedEmail}</span>
  );

  const resendEmailLink = (
    <InlineTextButton rootClassName={css.helperLink} onClick={() => onSubmitEmail(submittedEmail)}>
      <FormattedMessage id="PasswordRecoveryPage.resendEmailLinkText" />
    </InlineTextButton>
  );

  const fixEmailLink = (
    <InlineTextButton rootClassName={css.helperLink} onClick={onRetypeEmail}>
      <FormattedMessage id="PasswordRecoveryPage.fixEmailLinkText" />
    </InlineTextButton>
  );

  return (
    <div className={css.content}>
      <Heading as="h1" rootClassName={css.cardTitle}>
        <FormattedMessage id="PasswordRecoveryPage.emailSubmittedTitle" />
      </Heading>
      <p className={css.cardMessage}>
        <FormattedMessage
          id="PasswordRecoveryPage.emailSubmittedMessage"
          values={{ submittedEmailText }}
        />
      </p>
      <div className={css.bottomWrapper}>
        <p className={css.helperText}>
          {recoveryInProgress ? (
            <FormattedMessage id="PasswordRecoveryPage.resendingEmailInfo" />
          ) : (
            <FormattedMessage
              id="PasswordRecoveryPage.resendEmailInfo"
              values={{ resendEmailLink }}
            />
          )}
        </p>
        <p className={css.helperText}>
          <FormattedMessage id="PasswordRecoveryPage.fixEmailInfo" values={{ fixEmailLink }} />
        </p>
      </div>
    </div>
  );
};

/**
 * The password recovery page — shares the split-layout design of the
 * login/signup pages: dark immersive brand backdrop on the left, light form
 * card on the right.
 *
 * @param {Object} props
 * @param {boolean} props.scrollingDisabled - Whether the scrolling is disabled
 * @param {string} props.initialEmail - The initial email
 * @param {string} props.submittedEmail - The submitted email
 * @param {propTypes.error} props.recoveryError - The recovery error
 * @param {boolean} props.recoveryInProgress - Whether the recovery is in progress
 * @param {boolean} props.passwordRequested - Whether the password is requested
 * @param {function} props.onChange - The function to change the email
 * @param {function} props.onSubmitEmail - The function to submit the email
 * @param {function} props.onRetypeEmail - The function to retype the email
 * @returns {JSX.Element} Password recovery page component
 */
export const PasswordRecoveryPageComponent = props => {
  const intl = useIntl();
  const location = useLocation();
  const { ref: revealRef, enabled: revealEnabled, revealed } = useReveal();
  const searchParams = new URLSearchParams(location.search);
  const emailParam = searchParams.get('email');

  const {
    scrollingDisabled,
    initialEmail,
    submittedEmail,
    recoveryError,
    recoveryInProgress,
    passwordRequested,
    onChange,
    onSubmitEmail,
    onRetypeEmail,
  } = props;
  const alreadyrequested = submittedEmail || passwordRequested;
  const emailToUse = emailParam || initialEmail;
  const showPasswordRecoveryForm = (
    <PasswordRecovery
      initialEmail={emailToUse}
      onChange={onChange}
      onSubmitEmail={onSubmitEmail}
      recoveryInProgress={recoveryInProgress}
      recoveryError={recoveryError}
    />
  );

  return (
    <Page
      title={intl.formatMessage({
        id: 'PasswordRecoveryPage.title',
      })}
      scrollingDisabled={scrollingDisabled}
    >
      <LayoutSingleColumn topbar={<TopbarContainer />} footer={<FooterContainer />}>
        <section className={css.root}>
          <div className={css.backdrop} aria-hidden="true">
            <div className={css.gridLines} />
            <div className={css.orbA} />
            <div className={css.orbB} />
          </div>

          <div
            ref={revealRef}
            className={classNames(css.layout, {
              [css.revealReady]: revealEnabled,
              [css.isRevealed]: revealed,
            })}
          >
            <BrandPanel intl={intl} />

            <div className={css.formPanel}>
              <div className={css.card}>
                {isPasswordRecoveryEmailNotFoundError(recoveryError) ? (
                  showPasswordRecoveryForm
                ) : recoveryError ? (
                  <GenericError />
                ) : alreadyrequested ? (
                  <EmailSubmittedContent
                    passwordRequested={passwordRequested}
                    initialEmail={initialEmail}
                    submittedEmail={submittedEmail}
                    onRetypeEmail={onRetypeEmail}
                    onSubmitEmail={onSubmitEmail}
                    recoveryInProgress={recoveryInProgress}
                  />
                ) : (
                  showPasswordRecoveryForm
                )}
              </div>
            </div>
          </div>
        </section>
      </LayoutSingleColumn>
    </Page>
  );
};

const mapStateToProps = state => {
  const {
    initialEmail,
    submittedEmail,
    recoveryError,
    recoveryInProgress,
    passwordRequested,
  } = state.PasswordRecoveryPage;
  return {
    scrollingDisabled: isScrollingDisabled(state),
    initialEmail,
    submittedEmail,
    recoveryError,
    recoveryInProgress,
    passwordRequested,
  };
};

const mapDispatchToProps = dispatch => ({
  onChange: () => dispatch(clearPasswordRecoveryError()),
  onSubmitEmail: email => dispatch(recoverPassword({ email })),
  onRetypeEmail: () => dispatch(retypePasswordRecoveryEmail()),
});

const PasswordRecoveryPage = compose(
  connect(
    mapStateToProps,
    mapDispatchToProps
  )
)(PasswordRecoveryPageComponent);

export default PasswordRecoveryPage;
