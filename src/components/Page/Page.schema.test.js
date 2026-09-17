import {
  buildOrganizationNode,
  buildWebSiteNode,
  getOrganizationLogoURL,
  getOrganizationSameAs,
} from './Page.schema';

const root = 'https://www.example.com';

const imageAssetLogo = {
  type: 'imageAsset',
  attributes: {
    variants: {
      scaled: { url: 'https://cdn.example.com/logo-scaled.png', width: 185, height: 48 },
      scaled2x: { url: 'https://cdn.example.com/logo-scaled2x.png', width: 370, height: 96 },
    },
  },
};

describe('Page.schema', () => {
  describe('getOrganizationSameAs', () => {
    it('merges local config values with footer social-media links, deduplicated', () => {
      const config = {
        siteFacebookPage: 'https://www.facebook.com/example/',
        siteTwitterHandle: '@example',
        siteInstagramPage: null,
        footer: {
          socialMediaLinks: [
            {
              blockType: 'socialMediaLink',
              link: { platform: 'instagram', url: 'https://www.instagram.com/example/' },
            },
            {
              blockType: 'socialMediaLink',
              link: { platform: 'facebook', url: 'https://www.facebook.com/example/' },
            },
            { blockType: 'socialMediaLink', link: { platform: 'tiktok', url: '   ' } },
            { blockType: 'socialMediaLink' },
          ],
        },
      };
      expect(getOrganizationSameAs(config)).toEqual([
        'https://www.facebook.com/example/',
        'https://twitter.com/example',
        'https://www.instagram.com/example/',
      ]);
    });

    it('returns an empty list when nothing is configured', () => {
      expect(getOrganizationSameAs({})).toEqual([]);
      expect(getOrganizationSameAs({ footer: {} })).toEqual([]);
      expect(getOrganizationSameAs({ footer: { socialMediaLinks: 'nope' } })).toEqual([]);
    });
  });

  describe('getOrganizationLogoURL', () => {
    it('picks the largest variant of a hosted imageAsset logo', () => {
      expect(getOrganizationLogoURL({ logoImageDesktop: imageAssetLogo }, root)).toBe(
        'https://cdn.example.com/logo-scaled2x.png'
      );
    });

    it('makes a bundled (relative) fallback logo absolute', () => {
      expect(getOrganizationLogoURL({ logoImageDesktop: '/static/media/logo.png' }, root)).toBe(
        `${root}/static/media/logo.png`
      );
      expect(getOrganizationLogoURL({ logoImageDesktop: 'static/media/logo.png' }, root)).toBe(
        `${root}/static/media/logo.png`
      );
      expect(getOrganizationLogoURL({ logoImageDesktop: 'https://x.test/l.png' }, root)).toBe(
        'https://x.test/l.png'
      );
    });

    it('returns null when there is no usable logo', () => {
      expect(getOrganizationLogoURL({}, root)).toBeNull();
      expect(
        getOrganizationLogoURL({ logoImageDesktop: { type: 'imageAsset', attributes: {} } }, root)
      ).toBeNull();
    });
  });

  describe('buildOrganizationNode', () => {
    it('omits logo, sameAs and contactPoint while they are empty', () => {
      const node = buildOrganizationNode({
        config: { branding: {} },
        marketplaceRootURL: root,
        marketplaceName: 'Example',
      });
      expect(node).toEqual({
        '@type': 'Organization',
        '@id': `${root}#organization`,
        name: 'Example',
        url: root,
      });
      expect(node).not.toHaveProperty('@context');
    });

    it('includes logo, sameAs, contactPoint and address when configured', () => {
      const node = buildOrganizationNode({
        config: {
          branding: { logoImageDesktop: imageAssetLogo },
          siteInstagramPage: 'https://www.instagram.com/example/',
          siteContactEmail: ' support@example.com ',
          address: { streetAddress: 'Main St 1', addressLocality: 'Vilnius' },
        },
        marketplaceRootURL: root,
        marketplaceName: 'Example',
      });
      expect(node.logo).toBe('https://cdn.example.com/logo-scaled2x.png');
      expect(node.sameAs).toEqual(['https://www.instagram.com/example/']);
      expect(node.contactPoint).toEqual({
        '@type': 'ContactPoint',
        contactType: 'customer support',
        email: 'support@example.com',
        availableLanguage: ['en', 'lt', 'pl'],
      });
      expect(node.address).toEqual({ streetAddress: 'Main St 1', addressLocality: 'Vilnius' });
    });
  });

  describe('buildWebSiteNode', () => {
    it('targets the locale-prefixed keyword search and keeps the site description', () => {
      expect(
        buildWebSiteNode({
          marketplaceRootURL: root,
          marketplaceName: 'Example',
          description: 'An online marketplace.',
          locale: 'lt',
        })
      ).toEqual({
        '@type': 'WebSite',
        '@id': `${root}#website`,
        name: 'Example',
        url: root,
        description: 'An online marketplace.',
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${root}/lt/s?keywords={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
      });
    });

    it('omits an empty description', () => {
      const node = buildWebSiteNode({
        marketplaceRootURL: root,
        marketplaceName: 'Example',
        locale: 'en',
      });
      expect(node).not.toHaveProperty('description');
      expect(node.potentialAction.target.urlTemplate).toBe(
        `${root}/en/s?keywords={search_term_string}`
      );
    });
  });
});
