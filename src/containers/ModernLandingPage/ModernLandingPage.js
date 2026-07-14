import React from 'react';
import { compose } from 'redux';
import { connect } from 'react-redux';

import { useConfiguration } from '../../context/configurationContext';
import { useIntl } from '../../util/reactIntl';
import { isScrollingDisabled } from '../../ducks/ui.duck';
import { getListingsById } from '../../ducks/marketplaceData.duck';

import { Page, LayoutSingleColumn } from '../../components';

import TopbarContainer from '../TopbarContainer/TopbarContainer';
import FooterContainer from '../FooterContainer/FooterContainer';

import SectionHero from './sections/SectionHero';
import SectionStats from './sections/SectionStats';
import SectionCategories from './sections/SectionCategories';
import SectionHowItWorks from './sections/SectionHowItWorks';
import SectionFeatures from './sections/SectionFeatures';
import SectionFinalCta from './sections/SectionFinalCta';

import css from './ModernLandingPage.module.css';

/**
 * A standalone, code-owned landing page (not editable through Console).
 * Content is static and translated via src/translations — category labels
 * reuse the hostedLabels overlay so they stay in sync with Console category
 * renames. The hero showcase renders real listings loaded via loadData.
 */
export const ModernLandingPageComponent = props => {
  const { scrollingDisabled, featuredListings } = props;
  const config = useConfiguration();
  const intl = useIntl();

  const marketplaceName = config.marketplaceName;
  const schemaTitle = intl.formatMessage(
    { id: 'ModernLandingPage.schemaTitle' },
    { marketplaceName }
  );
  const schemaDescription = intl.formatMessage({ id: 'ModernLandingPage.schemaDescription' });

  return (
    <Page
      title={schemaTitle}
      description={schemaDescription}
      scrollingDisabled={scrollingDisabled}
      schema={{
        '@context': 'http://schema.org',
        '@type': 'WebPage',
        name: schemaTitle,
        description: schemaDescription,
      }}
    >
      <LayoutSingleColumn topbar={<TopbarContainer />} footer={<FooterContainer />}>
        <div className={css.root}>
          <SectionHero listings={featuredListings} />
          <SectionStats />
          <SectionCategories />
          <SectionHowItWorks />
          <SectionFeatures />
          <SectionFinalCta />
        </div>
      </LayoutSingleColumn>
    </Page>
  );
};

const mapStateToProps = state => {
  const { featuredListingRefs } = state.ModernLandingPage;
  return {
    scrollingDisabled: isScrollingDisabled(state),
    featuredListings: getListingsById(state, featuredListingRefs.map(ref => ref.id)),
  };
};

const ModernLandingPage = compose(connect(mapStateToProps))(ModernLandingPageComponent);

export default ModernLandingPage;
