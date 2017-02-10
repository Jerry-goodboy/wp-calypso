/**
 * External dependencies
 */
var page = require( 'page' ),
	React = require( 'react' ),
	{ connect } = require( 'react-redux' );

/**
 * Internal dependencies
 */
import HeaderCake from 'components/header-cake';
import Main from 'components/main';
import SiteRedirectStep from './site-redirect-step';
import observe from 'lib/mixins/data-observe';
import { isSiteUpgradeable } from 'state/sites/selectors';

const SiteRedirect = React.createClass( {
	mixins: [ observe( 'productsList', 'sites' ) ],

	propTypes: {
		productsList: React.PropTypes.object.isRequired,
		sites: React.PropTypes.object.isRequired
	},

	componentWillMount: function() {
		this.checkSiteIsUpgradeable();
	},

	componentDidMount: function() {
		this.props.sites.on( 'change', this.checkSiteIsUpgradeable );
	},

	componentWillUnmount: function() {
		this.props.sites.off( 'change', this.checkSiteIsUpgradeable );
	},

	checkSiteIsUpgradeable: function( ) {
		var selectedSite = this.props.sites.getSelectedSite();

		if ( selectedSite && ! this.props.isSiteUpgradeable ) {
			page.redirect( '/domains/add' );
		}
	},

	backToDomainSearch: function() {
		page( '/domains/add/' + this.props.sites.getSelectedSite().slug );
	},

	render: function() {
		return (
			<Main>
				<HeaderCake onClick={ this.backToDomainSearch }>
					{ this.translate( 'Redirect a Site' ) }
				</HeaderCake>

				<SiteRedirectStep
					cart={ this.props.cart }
					products={ this.props.productsList.get() }
					selectedSite={ this.props.sites.getSelectedSite() } />
			</Main>
		);
	}
} );

export default connect(
	( state, ownProps ) => {
		const selectedSite = ownProps.sites.getSelectedSite();

		return {
			isSiteUpgradeable: isSiteUpgradeable( state, selectedSite && selectedSite.ID )
		};
	}
)( SiteRedirect );
