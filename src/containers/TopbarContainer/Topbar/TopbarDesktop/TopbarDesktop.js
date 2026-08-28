import React, { useState, useEffect } from 'react';
import classNames from 'classnames';

import { FormattedMessage } from '../../../../util/reactIntl';
import { ACCOUNT_SETTINGS_PAGES } from '../../../../routing/routeConfiguration';
import {
  Avatar,
  InlineTextButton,
  LanguageSwitcher,
  LinkedLogo,
  Menu,
  MenuLabel,
  MenuContent,
  MenuItem,
  NamedLink,
  NotificationBadge,
} from '../../../../components';

import TopbarSearchForm from '../TopbarSearchForm/TopbarSearchForm';
import {
  usePayoutStatus,
  PAYOUT_STATUS_RESTRICTED,
} from '../PayoutStatusBanner/PayoutStatusBanner';
import CustomLinksMenu from './CustomLinksMenu/CustomLinksMenu';

import css from './TopbarDesktop.module.css';

const SignupLink = () => {
  return (
    <NamedLink id="signup-link" name="SignupPage" className={css.signupCta}>
      <FormattedMessage id="TopbarDesktop.signup" />
    </NamedLink>
  );
};

const LoginLink = () => {
  return (
    <NamedLink id="login-link" name="LoginPage" className={css.topbarLink}>
      <span className={css.topbarLinkLabel}>
        <FormattedMessage id="TopbarDesktop.login" />
      </span>
    </NamedLink>
  );
};

const InboxLink = ({ notificationCount, unreadMessageCount, inboxTab }) => {
  // Unread messages are shown as an exact count. Transactions needing action
  // keep the plain dot — they aren't countable in the same units, so they only
  // surface when there is no message count occupying the same spot.
  const hasUnreadMessages = unreadMessageCount > 0;
  const messageBadgeMaybe = hasUnreadMessages ? (
    <NotificationBadge rootClassName={css.inboxMessageBadge} count={unreadMessageCount} />
  ) : null;
  const notificationDotMaybe =
    !hasUnreadMessages && notificationCount > 0 ? <div className={css.notificationDot} /> : null;

  return (
    <NamedLink
      id="inbox-link"
      className={css.topbarLink}
      name="InboxPage"
      params={{ tab: inboxTab }}
    >
      <span className={css.topbarLinkLabel}>
        <FormattedMessage id="TopbarDesktop.inbox" />
        {messageBadgeMaybe}
        {notificationDotMaybe}
      </span>
    </NamedLink>
  );
};

const ProfileMenu = ({
  currentPage,
  currentUser,
  onLogout,
  showManageListingsLink,
  intl,
  payoutStatus,
  unreadMessageCount,
}) => {
  const currentPageClass = page => {
    const isAccountSettingsPage =
      page === 'AccountSettingsPage' && ACCOUNT_SETTINGS_PAGES.includes(currentPage);
    return currentPage === page || isAccountSettingsPage ? css.currentPage : null;
  };

  const payoutDotClasses = classNames(css.payoutDot, {
    [css.payoutDotRestricted]: payoutStatus === PAYOUT_STATUS_RESTRICTED,
  });
  const avatarPayoutDotMaybe = payoutStatus ? <span className={payoutDotClasses} /> : null;
  const avatarMessageBadgeMaybe =
    unreadMessageCount > 0 ? (
      <NotificationBadge rootClassName={css.messageBadge} count={unreadMessageCount} />
    ) : null;
  const menuItemPayoutDotMaybe = payoutStatus ? (
    <span
      className={classNames(css.menuItemPayoutDot, {
        [css.payoutDotRestricted]: payoutStatus === PAYOUT_STATUS_RESTRICTED,
      })}
    />
  ) : null;

  return (
    <Menu skipFocusOnNavigation={true}>
      <MenuLabel
        id="profile-menu-label"
        className={css.profileMenuLabel}
        isOpenClassName={css.profileMenuIsOpen}
        ariaLabel={intl.formatMessage({ id: 'TopbarDesktop.screenreader.profileMenu' })}
      >
        <span className={css.avatarWrapper}>
          <Avatar className={css.avatar} user={currentUser} disableProfileLink />
          {avatarMessageBadgeMaybe}
          {avatarPayoutDotMaybe}
        </span>
      </MenuLabel>
      <MenuContent className={css.profileMenuContent}>
        {showManageListingsLink ? (
          <MenuItem key="ManageListingsPage">
            <NamedLink
              className={classNames(css.menuLink, currentPageClass('ManageListingsPage'))}
              name="ManageListingsPage"
            >
              <span className={css.menuItemBorder} />
              <FormattedMessage id="TopbarDesktop.yourListingsLink" />
            </NamedLink>
          </MenuItem>
        ) : null}
        <MenuItem key="ProfileSettingsPage">
          <NamedLink
            className={classNames(css.menuLink, currentPageClass('ProfileSettingsPage'))}
            name="ProfileSettingsPage"
          >
            <span className={css.menuItemBorder} />
            <FormattedMessage id="TopbarDesktop.profileSettingsLink" />
          </NamedLink>
        </MenuItem>
        <MenuItem key="AccountSettingsPage">
          <NamedLink
            className={classNames(css.menuLink, currentPageClass('AccountSettingsPage'))}
            name="AccountSettingsPage"
          >
            <span className={css.menuItemBorder} />
            <FormattedMessage id="TopbarDesktop.accountSettingsLink" />
            {menuItemPayoutDotMaybe}
          </NamedLink>
        </MenuItem>
        <MenuItem key="logout">
          <InlineTextButton rootClassName={css.logoutButton} onClick={onLogout}>
            <span className={css.menuItemBorder} />
            <FormattedMessage id="TopbarDesktop.logout" />
          </InlineTextButton>
        </MenuItem>
      </MenuContent>
    </Menu>
  );
};

/**
 * Topbar for desktop layout
 *
 * @component
 * @param {Object} props
 * @param {string?} props.className add more style rules in addition to components own css.root
 * @param {string?} props.rootClassName overwrite components own css.root
 * @param {CurrentUser} props.currentUser API entity
 * @param {string?} props.currentPage
 * @param {boolean} props.isAuthenticated
 * @param {number} props.notificationCount
 * @param {number} props.unreadMessageCount number of unread messages across conversations
 * @param {Function} props.onLogout
 * @param {Function} props.onSearchSubmit
 * @param {Object?} props.initialSearchFormValues
 * @param {Object} props.intl
 * @param {Object} props.config
 * @param {boolean} props.showSearchForm
 * @param {boolean} props.showCreateListingsLink
 * @param {string} props.inboxTab
 * @returns {JSX.Element} search icon
 */
const TopbarDesktop = props => {
  const {
    className,
    config,
    customLinks,
    currentUser,
    currentPage,
    rootClassName,
    notificationCount = 0,
    unreadMessageCount = 0,
    intl,
    isAuthenticated,
    onLogout,
    onSearchSubmit,
    initialSearchFormValues = {},
    showSearchForm,
    showCreateListingsLink,
    inboxTab,
    onDark,
    scrolled,
  } = props;
  const [mounted, setMounted] = useState(false);
  const payoutStatus = usePayoutStatus();

  useEffect(() => {
    setMounted(true);
  }, []);

  const marketplaceName = config.marketplaceName;
  const authenticatedOnClientSide = mounted && isAuthenticated;
  const isAuthenticatedOrJustHydrated = isAuthenticated || !mounted;

  const giveSpaceForSearch = customLinks == null || customLinks?.length === 0;
  const classes = classNames(
    rootClassName || css.root,
    { [css.onDark]: onDark, [css.scrolled]: scrolled },
    className
  );

  const inboxLinkMaybe = authenticatedOnClientSide ? (
    <InboxLink
      notificationCount={notificationCount}
      unreadMessageCount={unreadMessageCount}
      inboxTab={inboxTab}
    />
  ) : null;

  const profileMenuMaybe = authenticatedOnClientSide ? (
    <ProfileMenu
      currentPage={currentPage}
      currentUser={currentUser}
      onLogout={onLogout}
      showManageListingsLink={showCreateListingsLink}
      intl={intl}
      payoutStatus={payoutStatus}
      unreadMessageCount={unreadMessageCount}
    />
  ) : null;

  const signupLinkMaybe = isAuthenticatedOrJustHydrated ? null : <SignupLink />;
  const loginLinkMaybe = isAuthenticatedOrJustHydrated ? null : <LoginLink />;

  const searchFormMaybe = showSearchForm ? (
    <TopbarSearchForm
      className={classNames(css.searchLink, { [css.takeAvailableSpace]: giveSpaceForSearch })}
      desktopInputRoot={css.topbarSearchWithLeftPadding}
      onSubmit={onSearchSubmit}
      initialValues={initialSearchFormValues}
      appConfig={config}
    />
  ) : (
    <div
      className={classNames(css.spacer, css.topbarSearchWithLeftPadding, {
        [css.takeAvailableSpace]: giveSpaceForSearch,
      })}
    />
  );

  return (
    <nav
      className={classes}
      aria-label={intl.formatMessage({ id: 'TopbarDesktop.screenreader.topbarNavigation' })}
    >
      <LinkedLogo
        id="logo-topbar-desktop"
        className={css.logoLink}
        layout="desktop"
        alt={intl.formatMessage({ id: 'TopbarDesktop.logo' }, { marketplaceName })}
        linkToExternalSite={config?.topbar?.logoLink}
      />
      {searchFormMaybe}

      <CustomLinksMenu
        currentPage={currentPage}
        customLinks={customLinks}
        intl={intl}
        hasClientSideContentReady={authenticatedOnClientSide || !isAuthenticatedOrJustHydrated}
        showCreateListingsLink={showCreateListingsLink}
      />

      {inboxLinkMaybe}
      {profileMenuMaybe}
      {loginLinkMaybe}
      {signupLinkMaybe}
      <LanguageSwitcher />
    </nav>
  );
};

export default TopbarDesktop;
