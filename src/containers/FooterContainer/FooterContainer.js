import React from 'react';
import { useConfiguration } from '../../context/configurationContext';
import { useIntl } from '../../util/reactIntl';
import {
  translateFooterSlogan,
  translateFooterCopyright,
  translateFooterBlocks,
} from '../../util/hostedLabels';
import loadable from '@loadable/component';

const SectionBuilder = loadable(
  () => import(/* webpackChunkName: "SectionBuilder" */ '../PageBuilder/PageBuilder'),
  {
    resolveComponent: components => components.SectionBuilder,
  }
);

const FooterComponent = () => {
  const { footer = {}, topbar } = useConfiguration();
  const intl = useIntl();

  // If footer asset is not set, let's not render Footer at all.
  if (Object.keys(footer).length === 0) {
    return null;
  }

  // The footer asset does not specify sectionId or sectionType. However, the SectionBuilder
  // expects sectionId and sectionType in order to identify the section. We add those
  // attributes here before passing the asset to SectionBuilder.
  // Slogan, copyright, and block markdown text are operator-authored strings from
  // Console — overlay them through hostedLabels here, so the rest of the render
  // pipeline (Field, BlockBuilder, markdownProcessor) stays locale-unaware.
  const footerSection = {
    ...footer,
    slogan: translateFooterSlogan(intl, footer.slogan),
    copyright: translateFooterCopyright(intl, footer.copyright),
    blocks: translateFooterBlocks(intl, footer.blocks),
    sectionId: 'footer',
    sectionType: 'footer',
    linkLogoToExternalSite: topbar?.logoLink,
  };

  return <SectionBuilder sections={[footerSection]} />;
};

// NOTE: if you want to add dynamic data to FooterComponent,
//       you could just connect this FooterContainer to Redux Store
//
// const mapStateToProps = state => {
//   const { currentUser } = state.user;
//   return { currentUser };
// };
// const FooterContainer = compose(connect(mapStateToProps))(FooterComponent);
// export default FooterContainer;

export default FooterComponent;
