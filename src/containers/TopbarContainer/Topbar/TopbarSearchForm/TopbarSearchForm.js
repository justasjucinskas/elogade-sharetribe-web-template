import React, { useEffect, useRef, useState } from 'react';
import { Form as FinalForm, Field } from 'react-final-form';
import { useSelector } from 'react-redux';
import { useHistory } from 'react-router-dom';
import classNames from 'classnames';

import { useRouteConfiguration } from '../../../../context/routeConfigurationContext';
import { useIntl } from '../../../../util/reactIntl';
import { isMainSearchTypeKeywords } from '../../../../util/search';
import { createResourceLocatorString } from '../../../../util/routes';
import { createSlug } from '../../../../util/urlHelpers';

import { Form, LocationAutocompleteInput } from '../../../../components';

import IconSearchDesktop from './IconSearchDesktop';
import SearchPreviewDropdown from './SearchPreviewDropdown';
import css from './TopbarSearchForm.module.css';

const identity = v => v;

const MIN_PREVIEW_CHARS = 2;
// Stable identity, so the selector below can't return a fresh array each render.
const NO_LISTINGS = [];

const KeywordSearchField = props => {
  const { keywordSearchWrapperClasses, iconClass, intl, isMobile = false, inputRef } = props;
  // Live typeahead preview (desktop topbar + mobile search modal).
  const showPreview = true;
  const [isPreviewOpen, setPreviewOpen] = useState(false);
  // Index of the arrow-key-highlighted row; -1 means "no row picked, Enter
  // submits the keyword search as usual".
  const [activeIndex, setActiveIndex] = useState(-1);
  const history = useHistory();
  const routeConfiguration = useRouteConfiguration();
  // The dropdown is the connected component, but Enter/arrow handling lives on
  // the input up here, so it reads the same slice to resolve the active row.
  const previewListings = useSelector(state => state.searchPreview?.listings) || NO_LISTINGS;

  // A new result set invalidates the highlight — otherwise Enter could open a
  // listing the user can no longer see.
  useEffect(() => {
    setActiveIndex(-1);
  }, [previewListings]);

  const listboxId = isMobile ? 'keyword-search-mobile-listbox' : 'keyword-search-listbox';
  const optionId = i => `${listboxId}-option-${i}`;

  return (
    <div className={keywordSearchWrapperClasses}>
      <button
        className={css.searchSubmit}
        aria-label={intl.formatMessage({ id: 'TopbarDesktop.screenreader.search' })}
      >
        <div className={iconClass}>
          <IconSearchDesktop />
        </div>
      </button>
      <Field
        name="keywords"
        render={({ input, meta }) => {
          const trimmed = (input.value || '').trim();
          // The dropdown renders nothing below the character threshold, so
          // aria-expanded must not claim a popup that isn't there.
          const isExpanded = isPreviewOpen && trimmed.length >= MIN_PREVIEW_CHARS;
          const activeListing = previewListings[activeIndex];

          const handleFocus = e => {
            input.onFocus(e);
            setPreviewOpen(true);
          };
          const handleBlur = e => {
            input.onBlur(e);
            setPreviewOpen(false);
            setActiveIndex(-1);
          };
          const handleKeyDown = e => {
            if (e.key === 'Escape') {
              setPreviewOpen(false);
              setActiveIndex(-1);
              return;
            }
            if (!isExpanded || previewListings.length === 0) {
              return;
            }
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
              // Stop the caret from jumping to either end of the input.
              e.preventDefault();
              const delta = e.key === 'ArrowDown' ? 1 : -1;
              const count = previewListings.length;
              // Wrap around, with -1 (no selection) as a stop on the way past
              // either end so the keyword search stays reachable via Enter.
              const next = activeIndex + delta;
              setActiveIndex(next < -1 ? count - 1 : next >= count ? -1 : next);
            } else if (e.key === 'Enter' && activeListing) {
              // A row is highlighted — go to it instead of submitting the form.
              e.preventDefault();
              const { id, attributes } = activeListing;
              setPreviewOpen(false);
              setActiveIndex(-1);
              history.push(
                createResourceLocatorString('ListingPage', routeConfiguration, {
                  id: id.uuid,
                  slug: createSlug(attributes?.title || ''),
                })
              );
            }
          };
          return (
            <>
              <input
                className={isMobile ? css.mobileInput : css.desktopInput}
                {...input}
                onFocus={showPreview ? handleFocus : input.onFocus}
                onBlur={showPreview ? handleBlur : input.onBlur}
                onKeyDown={handleKeyDown}
                id={isMobile ? 'keyword-search-mobile' : 'keyword-search'}
                data-testid={isMobile ? 'keyword-search-mobile' : 'keyword-search'}
                ref={inputRef}
                type="text"
                placeholder={intl.formatMessage({
                  id: 'TopbarSearchForm.placeholder',
                })}
                autoComplete="off"
                role={showPreview ? 'combobox' : undefined}
                aria-expanded={showPreview ? isExpanded : undefined}
                aria-autocomplete={showPreview ? 'list' : undefined}
                aria-controls={
                  // Only referenceable while the <ul> is actually rendered —
                  // the status-only states ("Searching…", "No matches") have
                  // no listbox to point at.
                  showPreview && isExpanded && previewListings.length > 0 ? listboxId : undefined
                }
                aria-activedescendant={activeListing ? optionId(activeIndex) : undefined}
              />
              {showPreview ? (
                <SearchPreviewDropdown
                  keywords={input.value}
                  isOpen={isPreviewOpen}
                  onSelect={() => {
                    setPreviewOpen(false);
                    setActiveIndex(-1);
                  }}
                  listboxId={listboxId}
                  optionId={optionId}
                  activeIndex={activeIndex}
                />
              ) : null}
            </>
          );
        }}
      />
    </div>
  );
};
const SubmitButton = props => {
  const intl = useIntl();
  return (
    <button
      className={css.searchSubmit}
      aria-label={intl.formatMessage({ id: 'TopbarDesktop.screenreader.search' })}
      type="submit"
      {...props}
    >
      <IconSearchDesktop />
    </button>
  );
};

const LocationSearchField = props => {
  const { desktopInputRootClass, intl, isMobile = false, inputRef, onLocationChange } = props;
  return (
    <Field
      name="location"
      format={identity}
      render={({ input, meta }) => {
        const { onChange, ...restInput } = input;

        // Merge the standard onChange function with custom behaviur. A better solution would
        // be to use the FormSpy component from Final Form and pass onChange to the
        // onChange prop but that breaks due to insufficient subscription handling.
        // See: https://github.com/final-form/react-final-form/issues/159
        const searchOnChange = value => {
          onChange(value);
          onLocationChange(value);
        };

        return (
          <LocationAutocompleteInput
            id={isMobile ? 'location-search-mobile' : 'location-search'}
            className={isMobile ? css.mobileInputRoot : desktopInputRootClass}
            iconClassName={isMobile ? css.mobileIcon : css.desktopIcon}
            inputClassName={isMobile ? css.mobileInput : css.desktopInput}
            predictionsClassName={isMobile ? css.mobilePredictions : css.desktopPredictions}
            predictionsAttributionClassName={isMobile ? css.mobilePredictionsAttribution : null}
            placeholder={intl.formatMessage({ id: 'TopbarSearchForm.placeholder' })}
            closeOnBlur={!isMobile}
            inputRef={inputRef}
            input={{ ...restInput, onChange: searchOnChange }}
            meta={meta}
            submitButton={SubmitButton}
            ariaLabel={intl.formatMessage({ id: 'TopbarDesktop.screenreader.search' })}
          />
        );
      }}
    />
  );
};

/**
 * The main search form for the Topbar.
 *
 * @component
 * @param {Object} props
 * @param {string?} props.className add more style rules in addition to components own css.root
 * @param {string?} props.rootClassName overwrite components own css.root
 * @param {string?} props.desktopInputRoot root class for desktop form input
 * @param {Function} props.onSubmit
 * @param {boolean} props.isMobile
 * @param {Object} props.appConfig
 * @returns {JSX.Element} search form element
 */
const TopbarSearchForm = props => {
  const searchInpuRef = useRef(null);
  const intl = useIntl();
  const { appConfig, onSubmit, ...restOfProps } = props;

  const onChange = location => {
    if (!isMainSearchTypeKeywords(appConfig) && location.selectedPlace) {
      // Note that we use `onSubmit` instead of the conventional
      // `handleSubmit` prop for submitting. We want to autosubmit
      // when a place is selected, and don't require any extra
      // validations for the form.
      onSubmit({ location });
      // blur search input to hide software keyboard
      searchInpuRef?.current?.blur();
    }
  };

  const onKeywordSubmit = values => {
    if (isMainSearchTypeKeywords(appConfig)) {
      onSubmit({ keywords: values.keywords });
      // blur search input to hide software keyboard
      searchInpuRef?.current?.blur();
    }
  };

  const onLocationSubmit = values => {
    // Allow submit button click for an empty location search form
    if (!isMainSearchTypeKeywords(appConfig)) {
      onSubmit({ location: values.location });
    }
  };

  const isKeywordsSearch = isMainSearchTypeKeywords(appConfig);
  const submit = isKeywordsSearch ? onKeywordSubmit : onLocationSubmit;
  return (
    <FinalForm
      {...restOfProps}
      onSubmit={submit}
      render={formRenderProps => {
        const {
          rootClassName,
          className,
          desktopInputRoot,
          isMobile = false,
          handleSubmit,
        } = formRenderProps;
        const classes = classNames(rootClassName, className);
        const desktopInputRootClass = desktopInputRoot || css.desktopInputRoot;

        const keywordSearchWrapperClasses = classNames(
          css.keywordSearchWrapper,
          isMobile ? css.mobileInputRoot : desktopInputRootClass
        );

        return (
          <Form className={classes} onSubmit={handleSubmit} enforcePagePreloadFor="SearchPage">
            {isKeywordsSearch ? (
              <KeywordSearchField
                keywordSearchWrapperClasses={keywordSearchWrapperClasses}
                iconClass={classNames(isMobile ? css.mobileIcon : css.desktopIcon || css.icon)}
                intl={intl}
                isMobile={isMobile}
                inputRef={searchInpuRef}
              />
            ) : (
              <LocationSearchField
                desktopInputRootClass={desktopInputRootClass}
                intl={intl}
                isMobile={isMobile}
                inputRef={searchInpuRef}
                onLocationChange={onChange}
              />
            )}
          </Form>
        );
      }}
    />
  );
};

export default TopbarSearchForm;
