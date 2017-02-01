/**
 * External dependencies
 */
import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import page from 'page';

/**
 * Internal dependencies
 */
import Button from 'components/button';
import Card from 'components/card';
import config from 'config';
import { recordTracksEvent } from 'state/analytics/actions';
import SiteURLInput from '../site-url-input';

import WordPressLogo from './wordpress-logo';
import JetpackLogo from './jetpack-logo';

const JetpackNewSite = React.createClass( {
	displayName: 'JetpackNewSite',

	componentDidMount() {
		this.props.recordTracksEvent( 'calypso_jetpack_new_site_view' );
	},

	getNewWpcomSiteUrl() {
		return config( 'signup_url' ) + '?ref=calypso-selector';
	},

	onURLEnter() {
		this.props.recordTracksEvent( 'calypso_jetpack_new_site_connect_click' );
		page( '/jetpack/connect?url=' + this.refs.siteUrlInputRef.state.value.toLowerCase() );
	},

	handleOnClickTos() {
		this.props.recordTracksEvent( 'calypso_jpc_tos_link_click' );
	},

	render() {
		return (
			<div className="jetpack-new-site">
				<div className="jetpack-new-site__header">
					<h2 className="jetpack-new-site__header-title">{ this.translate( 'Add a New Site' ) }</h2>
					<div className="jetpack-new-site__header-text">{ this.translate(
						'Create a new shiny site on WordPress.com — you’ll be able to pick a visual theme and customize it to your liking. Optionally, you can connect your existing self-hosted WordPress site through Jetpack to benefit from dozens of WordPress.com exclusive features.'
					) } </div>
				</div>
				<div className="jetpack-new-site__content">
					<Card className="jetpack-new-site__wpcom-site">
						<WordPressLogo />
						<h3 className="jetpack-new-site__card-title">
							{ this.translate( 'Create a new shiny WordPress.com site' ) }
						</h3>
						<div className="jetpack-new-site__card-description">
						<p>
							{ this.translate( 'Start telling your story in just 2 minutes. Pick a visual theme and a domain — we’ll take care of the entire setup. If you need additional help we’ve got you covered with 24-7 hour support.' ) }
						</p>
						</div>
						<div className="jetpack-new-site__button-holder">
							<Button className="button is-primary" href={ this.getNewWpcomSiteUrl() }>{ this.translate( 'Start Now' ) }</Button>
						</div>
					</Card>
					<Card className="jetpack-new-site__jetpack-site">
						<JetpackLogo />
						<h3 className="jetpack-new-site__card-title">
							{ this.translate( 'Add an existing WordPress site with Jetpack' ) }
						</h3>
						<div className="jetpack-new-site__card-description">
							{ this.translate( 'We’ll be using the Jetpack plugin to connect your site to WordPress.com.' ) }
						</div>
						<SiteURLInput ref="siteUrlInputRef"
							onTosClick={ this.handleOnClickTos }
							onClick={ this.onURLEnter } />
					</Card>
					<Card className="jetpack-new-site__mobile">
						<div className="jetpack-new-site__mobile-wpcom-site">
							<Button className="button is-primary" href={ this.getNewWpcomSiteUrl() }>{ this.translate( 'Create a New WordPress.com Site Now' ) }</Button>
						</div>
						<div className="jetpack-new-site__divider">
							<span>or</span>
						</div>
						<div className="jetpack-new-site__mobile-jetpack-site">
							<p>Add an existing WordPress site with Jetpack by entering the address:</p>
							<SiteURLInput ref="siteUrlInputRef"
								onTosClick={ this.handleOnClickTos }
								onClick={ this.onURLEnter } />
						</div>
					</Card>
				</div>
			</div>
		);
	}
} );

export default connect(
	null,
	dispatch => bindActionCreators( {
		recordTracksEvent
	}, dispatch )
)( JetpackNewSite );
