import React from 'react';

// Import config and utils
import { useIntl } from '../../util/reactIntl';
import {
  SCHEMA_TYPE_ENUM,
  SCHEMA_TYPE_MULTI_ENUM,
  SCHEMA_TYPE_SHORT_TEXT,
  SCHEMA_TYPE_TEXT,
  SCHEMA_TYPE_LONG,
  SCHEMA_TYPE_BOOLEAN,
  SCHEMA_TYPE_YOUTUBE,
} from '../../util/types';
import {
  required,
  nonEmptyArray,
  validateInteger,
  validateYoutubeURL,
} from '../../util/validators';
import {
  formatListingFieldLabel,
  formatListingFieldHelpText,
  formatUserFieldLabel,
  formatUserFieldHelpText,
  translateEnumOptionsForForm,
  translateUserFieldEnumOptionsForForm,
} from '../../util/hostedLabels';
// Import shared components
import { FieldCheckboxGroup, FieldSelect, FieldTextInput, FieldBoolean } from '../../components';
// Import modules from this directory
import css from './CustomExtendedDataField.module.css';

// CustomExtendedDataField is shared between listing fields and user fields.
// `fieldNamespace` (default 'listing') selects which `hostedLabels` helpers to
// use for label + enum-option lookup. Callers that render user fields must pass
// `fieldNamespace="user"` to avoid silently falling back to the Console string.
const labelFormatterFor = namespace =>
  namespace === 'user' ? formatUserFieldLabel : formatListingFieldLabel;

const optionsFormatterFor = namespace =>
  namespace === 'user' ? translateUserFieldEnumOptionsForForm : translateEnumOptionsForForm;

const helpTextFormatterFor = namespace =>
  namespace === 'user' ? formatUserFieldHelpText : formatListingFieldHelpText;

const getLabel = (intl, fieldConfig, fieldNamespace) => {
  const fallback = fieldConfig?.saveConfig?.label || fieldConfig?.label;
  return labelFormatterFor(fieldNamespace)(intl, fieldConfig?.key, fallback);
};

// Help text comes from Console as a plain string; route it through the hosted-label
// overlay (keyed off the stable field key) so it localizes like labels/options.
const getHelpText = (intl, fieldConfig, fieldNamespace) =>
  helpTextFormatterFor(fieldNamespace)(intl, fieldConfig?.key, fieldConfig?.helpText);

const CustomFieldEnum = props => {
  const { name, fieldConfig, defaultRequiredMessage, formId, intl, fieldNamespace } = props;
  const { enumOptions = [], saveConfig, key: fieldKey } = fieldConfig || {};
  const { placeholderMessage, isRequired, requiredMessage } = saveConfig || {};
  const validateMaybe = isRequired
    ? { validate: required(requiredMessage || defaultRequiredMessage) }
    : {};
  const placeholder =
    placeholderMessage ||
    intl.formatMessage({ id: 'CustomExtendedDataField.placeholderSingleSelect' });
  const filterOptions = optionsFormatterFor(fieldNamespace)(intl, fieldKey, enumOptions);

  const label = getLabel(intl, fieldConfig, fieldNamespace);

  return filterOptions ? (
    <FieldSelect
      className={css.customField}
      name={name}
      id={formId ? `${formId}.${name}` : name}
      label={label}
      helpText={getHelpText(intl, fieldConfig, fieldNamespace)}
      {...validateMaybe}
    >
      <option disabled value="">
        {placeholder}
      </option>
      {filterOptions.map(optionConfig => {
        const key = optionConfig.key;
        return (
          <option key={key} value={key}>
            {optionConfig.label}
          </option>
        );
      })}
    </FieldSelect>
  ) : null;
};

const CustomFieldMultiEnum = props => {
  const { name, fieldConfig, defaultRequiredMessage, formId, intl, fieldNamespace } = props;
  const { enumOptions = [], saveConfig, key: fieldKey } = fieldConfig || {};
  const { isRequired, requiredMessage } = saveConfig || {};
  const label = getLabel(intl, fieldConfig, fieldNamespace);
  const validateMaybe = isRequired
    ? { validate: nonEmptyArray(requiredMessage || defaultRequiredMessage) }
    : {};

  return enumOptions ? (
    <FieldCheckboxGroup
      className={css.customField}
      id={formId ? `${formId}.${name}` : name}
      name={name}
      label={label}
      helpText={getHelpText(intl, fieldConfig, fieldNamespace)}
      options={optionsFormatterFor(fieldNamespace)(intl, fieldKey, enumOptions)}
      {...validateMaybe}
    />
  ) : null;
};

const CustomFieldShortText = props => {
  const { name, fieldConfig, defaultRequiredMessage, formId, intl, fieldNamespace } = props;
  const { placeholderMessage, isRequired, requiredMessage } = fieldConfig?.saveConfig || {};
  const label = getLabel(intl, fieldConfig, fieldNamespace);
  const validateMaybe = isRequired
    ? { validate: required(requiredMessage || defaultRequiredMessage) }
    : {};
  const placeholder =
    placeholderMessage || intl.formatMessage({ id: 'CustomExtendedDataField.placeholderText' });

  return (
    <FieldTextInput
      className={css.customField}
      id={formId ? `${formId}.${name}` : name}
      name={name}
      type="text"
      maxLength={70}
      label={label}
      helpText={getHelpText(intl, fieldConfig, fieldNamespace)}
      placeholder={placeholder}
      {...validateMaybe}
    />
  );
};

const CustomFieldText = props => {
  const { name, fieldConfig, defaultRequiredMessage, formId, intl, fieldNamespace } = props;
  const { placeholderMessage, isRequired, requiredMessage } = fieldConfig?.saveConfig || {};
  const label = getLabel(intl, fieldConfig, fieldNamespace);
  const validateMaybe = isRequired
    ? { validate: required(requiredMessage || defaultRequiredMessage) }
    : {};
  const placeholder =
    placeholderMessage || intl.formatMessage({ id: 'CustomExtendedDataField.placeholderText' });

  return (
    <FieldTextInput
      className={css.customField}
      id={formId ? `${formId}.${name}` : name}
      name={name}
      type="textarea"
      label={label}
      helpText={getHelpText(intl, fieldConfig, fieldNamespace)}
      placeholder={placeholder}
      {...validateMaybe}
    />
  );
};

const CustomFieldLong = props => {
  const { name, fieldConfig, defaultRequiredMessage, formId, intl, fieldNamespace } = props;
  const { minimum, maximum, saveConfig } = fieldConfig;
  const { placeholderMessage, isRequired, requiredMessage } = saveConfig || {};
  const label = getLabel(intl, fieldConfig, fieldNamespace);
  const placeholder =
    placeholderMessage || intl.formatMessage({ id: 'CustomExtendedDataField.placeholderLong' });
  const numberTooSmallMessage = intl.formatMessage(
    { id: 'CustomExtendedDataField.numberTooSmall' },
    { min: minimum }
  );
  const numberTooBigMessage = intl.formatMessage(
    { id: 'CustomExtendedDataField.numberTooBig' },
    { max: maximum }
  );

  // Field with schema type 'long' will always be validated against min & max
  const validate = (value, min, max) => {
    const requiredMsg = requiredMessage || defaultRequiredMessage;
    return isRequired && value == null
      ? requiredMsg
      : validateInteger(value, max, min, numberTooSmallMessage, numberTooBigMessage);
  };

  return (
    <FieldTextInput
      className={css.customField}
      id={formId ? `${formId}.${name}` : name}
      name={name}
      type="number"
      step="1"
      helpText={getHelpText(intl, fieldConfig, fieldNamespace)}
      parse={value => {
        const parsed = Number.parseInt(value, 10);
        return Number.isNaN(parsed) ? null : parsed;
      }}
      label={label}
      placeholder={placeholder}
      validate={value => validate(value, minimum, maximum)}
      onWheel={e => {
        // fix: number input should not change value on scroll
        if (e.target === document.activeElement) {
          // Prevent the input value change, because we prefer page scrolling
          e.target.blur();

          // Refocus immediately, on the next tick (after the current function is done)
          setTimeout(() => {
            e.target.focus();
          }, 0);
        }
      }}
    />
  );
};

const CustomFieldBoolean = props => {
  const { name, fieldConfig, defaultRequiredMessage, formId, intl, fieldNamespace } = props;
  const { placeholderMessage, isRequired, requiredMessage } = fieldConfig?.saveConfig || {};
  const label = getLabel(intl, fieldConfig, fieldNamespace);
  const validateMaybe = isRequired
    ? { validate: required(requiredMessage || defaultRequiredMessage) }
    : {};
  const placeholder =
    placeholderMessage || intl.formatMessage({ id: 'CustomExtendedDataField.placeholderBoolean' });

  return (
    <FieldBoolean
      className={css.customField}
      id={formId ? `${formId}.${name}` : name}
      name={name}
      label={label}
      helpText={getHelpText(intl, fieldConfig, fieldNamespace)}
      placeholder={placeholder}
      {...validateMaybe}
    />
  );
};

const CustomFieldYoutube = props => {
  const { name, fieldConfig, defaultRequiredMessage, formId, intl, fieldNamespace } = props;
  const { placeholderMessage, isRequired, requiredMessage } = fieldConfig?.saveConfig || {};
  const label = getLabel(intl, fieldConfig, fieldNamespace);
  const placeholder =
    placeholderMessage ||
    intl.formatMessage({ id: 'CustomExtendedDataField.placeholderYoutubeVideoURL' });

  const notValidUrlMessage = intl.formatMessage({
    id: 'CustomExtendedDataField.notValidYoutubeVideoURL',
  });

  const validate = value => {
    const requiredMsg = requiredMessage || defaultRequiredMessage;
    return isRequired && value == null
      ? requiredMsg
      : validateYoutubeURL(value, notValidUrlMessage);
  };

  return (
    <FieldTextInput
      className={css.customField}
      id={formId ? `${formId}.${name}` : name}
      name={name}
      type="text"
      label={label}
      helpText={getHelpText(intl, fieldConfig, fieldNamespace)}
      placeholder={placeholder}
      validate={value => validate(value)}
    />
  );
};

/**
 * Return Final Form field for each configuration according to schema type.
 *
 * These custom extended data fields are for generating input fields from configuration defined
 * in marketplace-custom-config.js. Other panels in EditListingWizard might add more extended data
 * fields (e.g. shipping fee), but these are independently customizable.
 *
 * @param {Object} props should contain fieldConfig that defines schemaType, enumOptions?, and
 * saveConfig for the field.
 */
const CustomExtendedDataField = props => {
  const intl = useIntl();
  const { fieldNamespace = 'listing', ...rest } = props;
  const { enumOptions = [], schemaType } = rest?.fieldConfig || {};
  const defaultRequiredMessage = intl.formatMessage({
    id: 'CustomExtendedDataField.required',
  });
  const renderFieldComponent = FieldComponent => (
    <FieldComponent
      {...rest}
      defaultRequiredMessage={defaultRequiredMessage}
      intl={intl}
      fieldNamespace={fieldNamespace}
    />
  );

  return schemaType === SCHEMA_TYPE_ENUM && enumOptions
    ? renderFieldComponent(CustomFieldEnum)
    : schemaType === SCHEMA_TYPE_MULTI_ENUM && enumOptions
    ? renderFieldComponent(CustomFieldMultiEnum)
    : schemaType === SCHEMA_TYPE_SHORT_TEXT
    ? renderFieldComponent(CustomFieldShortText)
    : schemaType === SCHEMA_TYPE_TEXT
    ? renderFieldComponent(CustomFieldText)
    : schemaType === SCHEMA_TYPE_LONG
    ? renderFieldComponent(CustomFieldLong)
    : schemaType === SCHEMA_TYPE_BOOLEAN
    ? renderFieldComponent(CustomFieldBoolean)
    : schemaType === SCHEMA_TYPE_YOUTUBE
    ? renderFieldComponent(CustomFieldYoutube)
    : null;
};

export default CustomExtendedDataField;
