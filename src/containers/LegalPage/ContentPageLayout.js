import React from 'react';
import { useSelector } from 'react-redux';
import classNames from 'classnames';

import { isScrollingDisabled } from '../../ducks/ui.duck';

import { Page, LayoutSingleColumn } from '../../components';

import TopbarContainer from '../TopbarContainer/TopbarContainer';
import FooterContainer from '../FooterContainer/FooterContainer';

import css from './LegalPage.module.css';

/**
 * Page shell of the code-owned content pages (legal documents, FAQ, About):
 * topbar, a light header band (kicker, title, lead, optional extras) and the
 * content column.
 *
 * @component
 * @param {Object} props
 * @param {string} props.metaTitle document <title>
 * @param {string} props.metaDescription meta description
 * @param {Object|Array<Object>} [props.schema] JSON-LD node(s); defaults to a WebPage node
 * @param {ReactNode} props.kicker small label above the title
 * @param {ReactNode} props.title the page's h1
 * @param {ReactNode} [props.lead] intro paragraph under the title
 * @param {ReactNode} [props.heroExtras] rendered at the bottom of the header band
 * @param {string} [props.contentClassName] extra class for the content column
 * @param {ReactNode} props.children page content
 * @returns {JSX.Element}
 */
const ContentPageLayout = props => {
  const {
    metaTitle,
    metaDescription,
    schema,
    kicker,
    title,
    lead,
    heroExtras,
    contentClassName,
    children,
  } = props;
  const scrollingDisabled = useSelector(isScrollingDisabled);

  return (
    <Page
      title={metaTitle}
      description={metaDescription}
      scrollingDisabled={scrollingDisabled}
      schema={
        schema || {
          '@context': 'http://schema.org',
          '@type': 'WebPage',
          name: metaTitle,
          description: metaDescription,
        }
      }
    >
      <LayoutSingleColumn topbar={<TopbarContainer />} footer={<FooterContainer />}>
        <div className={css.root}>
          <header className={css.hero}>
            <div className={css.heroInner}>
              <p className={css.kicker}>{kicker}</p>
              <h1 className={css.title}>{title}</h1>
              {lead ? <p className={css.lead}>{lead}</p> : null}
              {heroExtras}
            </div>
          </header>

          <div className={classNames(css.content, contentClassName)}>{children}</div>
        </div>
      </LayoutSingleColumn>
    </Page>
  );
};

export default ContentPageLayout;
