import React, { useEffect, useState } from 'react';
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
import SectionCategories from './sections/SectionCategories';
import SectionVideo from './sections/SectionVideo';
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
  const { scrollingDisabled, featuredListings, categoryCounts } = props;
  const config = useConfiguration();
  const intl = useIntl();

  // The topbar sits transparent over the dark hero and solidifies into a
  // frosted bar once the hero scrolls past. SSR renders the transparent
  // (top-of-page) state; the listener syncs it on mount and on scroll.
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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
      <LayoutSingleColumn
        topbar={<TopbarContainer onDark scrolled={scrolled} />}
        footer={<FooterContainer />}
      >
        <div className={css.root}>
          <SectionHero listings={featuredListings} />
          <SectionCategories categoryCounts={categoryCounts} />
          <SectionVideo />
          <SectionFeatures />
          <SectionFinalCta />
        </div>
      </LayoutSingleColumn>
    </Page>
  );
};

const mapStateToProps = state => {
  const { featuredListingRefs, categoryCounts } = state.ModernLandingPage;
  return {
    scrollingDisabled: isScrollingDisabled(state),
    featuredListings: getListingsById(state, featuredListingRefs.map(ref => ref.id)),
    categoryCounts,
  };
};

const ModernLandingPage = compose(connect(mapStateToProps))(ModernLandingPageComponent);

export default ModernLandingPage;
