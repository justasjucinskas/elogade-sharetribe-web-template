import React from 'react';
import classNames from 'classnames';
import { Form as FinalForm } from 'react-final-form';

import { useConfiguration } from '../../../context/configurationContext';
import { FormattedMessage, useIntl } from '../../../util/reactIntl';
import { propTypes } from '../../../util/types';
import { formatMoney } from '../../../util/currency';
import { composeValidators, required } from '../../../util/validators';

import { FieldCurrencyInput, FieldTextInput, Form, Modal, Button } from '../../../components';

import IconPriceTag from './IconPriceTag';
import css from './MakeCounterOfferModal.module.css';

const MakeCounterOfferForm = props => (
  <FinalForm
    {...props}
    render={fieldRenderProps => {
      const {
        className,
        rootClassName,
        disabled,
        handleSubmit,
        intl,
        formId,
        invalid,
        counterOfferSubmitted,
        counterOfferError,
        counterOfferInProgress,
        currencyConfig,
        currentOffer,
        offerValidator,
        offerInfo,
        messageField,
        submitButtonText,
        errorMessage,
      } = fieldRenderProps;

      const errorMessageMaybe = counterOfferError
        ? errorMessage || <FormattedMessage id="MakeCounterOfferForm.submitFailed" />
        : null;

      const classes = classNames(rootClassName || css.formRoot, className);
      const submitInProgress = counterOfferInProgress;
      const submitDisabled = invalid || disabled || submitInProgress;
      const currentOfferFormatted = currentOffer ? formatMoney(intl, currentOffer) : '$10.00';
      const requiredOffer = required(
        intl.formatMessage({ id: 'MakeCounterOfferForm.offerRequired' })
      );

      return (
        <Form className={classes} onSubmit={handleSubmit}>
          <FieldCurrencyInput
            className={css.counterOffer}
            id={formId ? `${formId}.counterOffer` : 'counterOffer'}
            name="counterOffer"
            label={intl.formatMessage({ id: 'MakeCounterOfferForm.offerLabel' })}
            placeholder={intl.formatMessage(
              { id: 'MakeCounterOfferForm.offerPlaceholder' },
              { currentOffer: currentOfferFormatted }
            )}
            currencyConfig={currencyConfig}
            validate={
              offerValidator ? composeValidators(requiredOffer, offerValidator) : requiredOffer
            }
          />
          {offerInfo ? <p className={css.offerInfo}>{offerInfo}</p> : null}
          {messageField ? (
            <FieldTextInput
              className={css.counterOfferMessage}
              inputRootClass={css.messageInput}
              type="textarea"
              id={formId ? `${formId}.message` : 'message'}
              name="message"
              label={messageField.label}
              placeholder={messageField.placeholder}
            />
          ) : null}
          {errorMessageMaybe ? <p className={css.errorPlaceholder}>{errorMessageMaybe}</p> : null}
          <Button
            className={css.submitButton}
            type="submit"
            inProgress={counterOfferInProgress}
            disabled={submitDisabled}
            ready={counterOfferSubmitted}
          >
            {submitButtonText || intl.formatMessage({ id: 'MakeCounterOfferForm.submit' })}
          </Button>
        </Form>
      );
    }}
  />
);

// Show counter offer form
const CounterOfferInfo = props => {
  const config = useConfiguration();
  const marketplaceName = config.marketplaceName;
  const { onMakeCounterOffer, title, description, ...restOfProps } = props;

  return (
    <>
      <p className={css.modalTitle}>
        {title || <FormattedMessage id="MakeCounterOfferModal.title" />}
      </p>
      <p className={css.modalMessage}>
        {description || (
          <FormattedMessage id="MakeCounterOfferModal.description" values={{ marketplaceName }} />
        )}
      </p>
      <MakeCounterOfferForm onSubmit={onMakeCounterOffer} {...restOfProps} />
    </>
  );
};

/**
 * Make counter offer modal
 *
 * @component
 * @param {Object} props - The props
 * @param {string} [props.className] - Custom class that extends the default class for the root element
 * @param {string} [props.rootClassName] - Custom class that extends the default class for the root element
 * @param {string} props.id - The id
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {Function} props.onCloseModal - The on close modal function
 * @param {Function} props.onManageDisableScrolling - The on manage disable scrolling function
 * @param {Function} props.onMakeCounterOffer - The on make counter offer function
 * @param {Object} props.currentOffer - The current offer
 * @param {boolean} props.counterOfferSubmitted - Whether the counter offer is submitted
 * @param {boolean} props.counterOfferInProgress - Whether the counter offer is in progress
 * @param {propTypes.error} props.counterOfferError - The counter offer error
 * @param {Object} props.currencyConfig - The currency configuration
 * @param {ReactNode} [props.title] - Overrides the default title
 * @param {ReactNode} [props.description] - Overrides the default description
 * @param {Function} [props.offerValidator] - Extra validator for the offer (Money), after "required"
 * @param {ReactNode} [props.offerInfo] - Shown under the offer input (e.g. allowed range)
 * @param {Object} [props.messageField] - { label, placeholder }: adds an optional message field
 * @param {string} [props.submitButtonText] - Overrides the default submit button text
 * @param {ReactNode} [props.errorMessage] - Overrides the default submit error message
 * @param {string} [props.formId] - Form id (used for field ids)
 * @returns {JSX.Element} The MakeCounterOfferModal component
 */
const MakeCounterOfferModal = props => {
  const intl = useIntl();
  const {
    className,
    rootClassName,
    id,
    isOpen = false,
    onCloseModal,
    focusElementId,
    onManageDisableScrolling,
    onMakeCounterOffer,
    counterOfferSubmitted = false,
    counterOfferInProgress = false,
    counterOfferError,
    currencyConfig,
    currentOffer,
    ...offerFormProps
  } = props;
  const classes = classNames(rootClassName || css.root, className);

  return (
    <Modal
      id={id}
      containerClassName={classes}
      contentClassName={css.modalContent}
      isOpen={isOpen}
      onClose={onCloseModal}
      onManageDisableScrolling={onManageDisableScrolling}
      focusElementId={focusElementId}
      usePortal
    >
      <IconPriceTag className={css.modalIcon} />
      <CounterOfferInfo
        currentOffer={currentOffer}
        onMakeCounterOffer={onMakeCounterOffer}
        counterOfferInProgress={counterOfferInProgress}
        counterOfferError={counterOfferError}
        counterOfferSubmitted={counterOfferSubmitted}
        intl={intl}
        currencyConfig={currencyConfig}
        {...offerFormProps}
      />
    </Modal>
  );
};

export default MakeCounterOfferModal;
