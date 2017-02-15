/**
 * External dependencies
 */
import page from 'page';
import React, { Component } from 'react';
import { connect } from 'react-redux';
import { localize } from 'i18n-calypso';

/**
 * Internal dependencies
 */
import HeaderCake from 'components/header-cake';
import Main from 'components/main';
import SiteRedirectStep from './site-redirect-step';
import { isSiteUpgradeable } from 'state/sites/selectors';
import { getSelectedSite, getSelectedSiteId } from 'state/ui/selectors';
import QueryProductsList from 'components/data/query-products-list';

class SiteRedirect extends Component {
	static propTypes = {
		isSiteUpgradeable: React.PropTypes.bool,
		productsList: React.PropTypes.object.isRequired,
		sites: React.PropTypes.object.isRequired,
	};

	constructor() {
		super();
		this.handleBackToDomainSearch = this.handleBackToDomainSearch.bind( this );
	}

	componentDidMount() {
		this.checkSiteIsUpgradeable();
	}

	componentWillReceiveProps() {
		this.checkSiteIsUpgradeable();
	}

	checkSiteIsUpgradeable() {
		if ( this.props.selectedSite && ! this.props.isSiteUpgradeable ) {
			page.redirect( '/domains/add' );
		}
	}

	handleBackToDomainSearch() {
		page( '/domains/add/' + this.props.selectedSite.slug );
	}

	render() {
		const {
			cart,
			selectedSite,
			productsList,
			translate,
		} = this.props;

		return (
			<Main>
				<HeaderCake onClick={ this.handleBackToDomainSearch }>
					{ translate( 'Redirect a Site' ) }
				</HeaderCake>

				<SiteRedirectStep
					cart={ cart }
					products={ productsList }
					selectedSite={ selectedSite } />

				<QueryProductsList />
			</Main>
		);
	}
}

export default connect(
	( state ) => ( {
		selectedSite: getSelectedSite( state ),
		isSiteUpgradeable: isSiteUpgradeable( state, getSelectedSiteId( state ) ),
		productsList: state.productsList.items,
	} )
)( localize( SiteRedirect ) );
