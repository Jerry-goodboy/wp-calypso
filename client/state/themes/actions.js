/**
 * External dependencies
 */
import { filter, map, property, delay, endsWith } from 'lodash';
import debugFactory from 'debug';
import page from 'page';

/**
 * Internal dependencies
 */
import wpcom from 'lib/wp';
import wporg from 'lib/wporg';
import {
	ACTIVE_THEME_REQUEST,
	ACTIVE_THEME_REQUEST_SUCCESS,
	ACTIVE_THEME_REQUEST_FAILURE,
	THEME_ACTIVATE_REQUEST,
	THEME_ACTIVATE_REQUEST_SUCCESS,
	THEME_ACTIVATE_REQUEST_FAILURE,
	THEME_BACK_PATH_SET,
	THEME_CLEAR_ACTIVATED,
	THEME_DELETE,
	THEME_DELETE_SUCCESS,
	THEME_DELETE_FAILURE,
	THEME_INSTALL,
	THEME_INSTALL_SUCCESS,
	THEME_INSTALL_FAILURE,
	THEME_REQUEST,
	THEME_REQUEST_SUCCESS,
	THEME_REQUEST_FAILURE,
	THEME_TRANSFER_INITIATE_FAILURE,
	THEME_TRANSFER_INITIATE_PROGRESS,
	THEME_TRANSFER_INITIATE_REQUEST,
	THEME_TRANSFER_INITIATE_SUCCESS,
	THEME_TRANSFER_STATUS_FAILURE,
	THEME_TRANSFER_STATUS_RECEIVE,
	THEME_UPLOAD_START,
	THEME_UPLOAD_SUCCESS,
	THEME_UPLOAD_FAILURE,
	THEME_UPLOAD_CLEAR,
	THEME_UPLOAD_PROGRESS,
	THEMES_RECEIVE,
	THEMES_REQUEST,
	THEMES_REQUEST_SUCCESS,
	THEMES_REQUEST_FAILURE,
	THEME_PREVIEW_OPTIONS,
	THEME_PREVIEW_STATE,
} from 'state/action-types';
import {
	recordTracksEvent,
	withAnalytics
} from 'state/analytics/actions';
import {
	getTheme,
	getActiveTheme,
	getLastThemeQuery,
	getThemeCustomizeUrl,
	getWpcomParentThemeId,
	shouldFilterWpcomThemes,
} from './selectors';
import {
	getThemeIdFromStylesheet,
	isThemeMatchingQuery,
	isThemeFromWpcom,
	normalizeJetpackTheme,
	normalizeWpcomTheme,
	normalizeWporgTheme
} from './utils';
import { getSiteTitle, isJetpackSite } from 'state/sites/selectors';
import { isSiteAutomatedTransfer } from 'state/selectors';
import i18n from 'i18n-calypso';
import accept from 'lib/accept';

const debug = debugFactory( 'calypso:themes:actions' ); //eslint-disable-line no-unused-vars

// Set destination for 'back' button on theme sheet
export function setBackPath( path ) {
	return {
		type: THEME_BACK_PATH_SET,
		path,
	};
}

/**
 * Returns an action object to be used in signalling that a theme object has
 * been received.
 *
 * @param  {Object} theme  Theme received
 * @param  {Number} siteId ID of site for which themes have been received
 * @return {Object}        Action object
 */
export function receiveTheme( theme, siteId ) {
	return receiveThemes( [ theme ], siteId );
}

/**
 * Returns an action object to be used in signalling that theme objects have
 * been received.
 *
 * @param  {Array}  themes Themes received
 * @param  {Number} siteId ID of site for which themes have been received
 * @return {Object}        Action object
 */
export function receiveThemes( themes, siteId ) {
	return ( dispatch, getState ) => {
		const filterWpcom = shouldFilterWpcomThemes( getState(), siteId );
		const { filteredThemes } = filterThemes( themes, siteId, filterWpcom );

		dispatch( {
			type: THEMES_RECEIVE,
			themes: filteredThemes,
			siteId
		} );
	};
}

/**
 * Returns an action object to be used in signalling that theme objects from
 * a query have been received.
 *
 * @param {Array}  themes Themes received
 * @param {number} siteId ID of site for which themes have been received
 * @param {Object} query Theme query used in the API request
 * @param {number} foundCount Number of themes returned by the query
 * @return {Object} Action object
 */
export function receiveThemesQuery( themes, siteId, query, foundCount ) {
	return ( dispatch, getState ) => {
		const filterWpcom = shouldFilterWpcomThemes( getState(), siteId );
		const { filteredThemes, found } = filterThemes(
			themes,
			siteId,
			filterWpcom,
			query,
			foundCount,
		);

		dispatch( {
			type: THEMES_REQUEST_SUCCESS,
			themes: filteredThemes,
			siteId,
			query,
			found: found,
		} );
	};
}

/**
 * Remove themes from a list. We need to do some client-side filtering
 * because:
 * 1) Jetpack theme API does not support search queries
 * 2) We need to filter out all wpcom themes to show an 'Uploaded' list
 *
 * @param {Array} themes list of themes to filter
 * @param {number} siteId the Site ID
 * @param {boolean} filterWpcom True to remove all wpcom themes
 * @param {Object} query the theme query
 * @param {number} found total number of themes matching query
 * @returns {Object} contains fields filteredThemes and found
 */
function filterThemes( themes, siteId, filterWpcom, query, found ) {
	if ( siteId === 'wporg' || siteId === 'wpcom' ) {
		return { filteredThemes: themes, found };
	}
	const filteredThemes = filter(
		themes,
		theme => (
			isThemeMatchingQuery( query, theme ) &&
			! ( filterWpcom && isThemeFromWpcom( theme ) )
		)
	);

	found = filteredThemes.length;
	return { filteredThemes, found };
}

/**
 * Triggers a network request to fetch themes for the specified site and query.
 *
 * @param  {Number|String} siteId        Jetpack site ID or 'wpcom' for any WPCOM site
 * @param  {Object}        query         Theme query
 * @param  {String}        query.search  Search string
 * @param  {String}        query.tier    Theme tier: 'free', 'premium', or '' (either)
 * @param  {String}        query.filter  Filter
 * @param  {Number}        query.number  How many themes to return per page
 * @param  {Number}        query.offset  At which item to start the set of returned themes
 * @param  {Number}        query.page    Which page of matching themes to return
 * @return {Function}                    Action thunk
 */
export function requestThemes( siteId, query = {} ) {
	return ( dispatch ) => {
		const startTime = new Date().getTime();

		dispatch( {
			type: THEMES_REQUEST,
			siteId,
			query
		} );

		let request;

		if ( siteId === 'wporg' ) {
			request = () => wporg.fetchThemesList( query );
		} else if ( siteId === 'wpcom' ) {
			request = () => wpcom.undocumented().themes( null, { ...query, apiVersion: '1.2' } );
		} else {
			request = () => wpcom.undocumented().themes( siteId, { ...query, apiVersion: '1' } );
		}

		// WP.com returns the number of results in a `found` attr, so we can use that right away.
		// WP.org returns an `info` object containing a `results` number, so we destructure that
		// and use it as default value for `found`.
		return request().then( ( { themes: rawThemes, info: { results } = {}, found = results } ) => {
			let themes;
			if ( siteId === 'wporg' ) {
				themes = map( rawThemes, normalizeWporgTheme );
			} else if ( siteId === 'wpcom' ) {
				themes = map( rawThemes, normalizeWpcomTheme );
			} else { // Jetpack Site
				themes = map( rawThemes, normalizeJetpackTheme );
			}

			if ( query.search && query.page === 1 ) {
				const responseTime = ( new Date().getTime() ) - startTime;
				const trackShowcaseSearch = recordTracksEvent(
					'calypso_themeshowcase_search',
					{
						search_term: query.search || null,
						tier: query.tier,
						response_time_in_ms: responseTime,
						result_count: found,
						results_first_page: themes.map( property( 'id' ) ).join()
					}
				);
				dispatch( trackShowcaseSearch );
			}

			dispatch( receiveThemesQuery( themes, siteId, query, found ) );
		} ).catch( ( error ) => {
			dispatch( {
				type: THEMES_REQUEST_FAILURE,
				siteId,
				query,
				error
			} );
		} );
	};
}

export function themeRequestFailure( siteId, themeId, error ) {
	return {
		type: THEME_REQUEST_FAILURE,
		siteId,
		themeId,
		error
	};
}

/**
 * Triggers a network request to fetch a specific theme from a site.
 *
 * @param  {String}   themeId Theme ID
 * @param  {Number}   siteId  Site ID
 * @return {Function}         Action thunk
 */
export function requestTheme( themeId, siteId ) {
	return ( dispatch ) => {
		dispatch( {
			type: THEME_REQUEST,
			siteId,
			themeId
		} );

		if ( siteId === 'wporg' ) {
			return wporg.fetchThemeInformation( themeId ).then( ( theme ) => {
				// Apparently, the WP.org REST API endpoint doesn't 404 but instead returns false
				// if a theme can't be found.
				if ( ! theme ) {
					throw ( 'Theme not found' ); // Will be caught by .catch() below
				}
				dispatch( receiveTheme( normalizeWporgTheme( theme ), siteId ) );
				dispatch( {
					type: THEME_REQUEST_SUCCESS,
					siteId,
					themeId
				} );
			} ).catch( ( error ) => {
				dispatch( {
					type: THEME_REQUEST_FAILURE,
					siteId,
					themeId,
					error
				} );
			} );
		}

		if ( siteId === 'wpcom' ) {
			return wpcom.undocumented().themeDetails( themeId ).then( ( theme ) => {
				dispatch( receiveTheme( normalizeWpcomTheme( theme ), siteId ) );
				dispatch( {
					type: THEME_REQUEST_SUCCESS,
					siteId,
					themeId
				} );
			} ).catch( ( error ) => {
				dispatch( {
					type: THEME_REQUEST_FAILURE,
					siteId,
					themeId,
					error
				} );
			} );
		}

		// See comment next to lib/wpcom-undocumented/lib/undocumented#jetpackThemeDetails() why we can't
		// the regular themeDetails() method for Jetpack sites yet.
		return wpcom.undocumented().jetpackThemeDetails( themeId, siteId ).then( ( { themes } ) => {
			dispatch( receiveThemes( map( themes, normalizeJetpackTheme ), siteId ) );
			dispatch( {
				type: THEME_REQUEST_SUCCESS,
				siteId,
				themeId
			} );
		} ).catch( ( error ) => {
			dispatch(
				themeRequestFailure( siteId, themeId, error )
			);
		} );
	};
}

/**
 * This action queries wpcom endpoint for active theme for site.
 * If request success information about active theme is stored in Redux themes subtree.
 * In case of error, error is stored in Redux themes subtree.
 *
 * @param  {Number}   siteId Site for which to check active theme
 * @return {Function}        Redux thunk with request action
 */
export function requestActiveTheme( siteId ) {
	return ( dispatch, getState ) => {
		dispatch( {
			type: ACTIVE_THEME_REQUEST,
			siteId,
		} );

		return wpcom.undocumented().activeTheme( siteId )
			.then( theme => {
				debug( 'Received current theme', theme );
				// We want to store the theme object in the appropriate Redux subtree -- either 'wpcom'
				// for WPCOM sites, or siteId for Jetpack sites.
				const siteIdOrWpcom = isJetpackSite( getState(), siteId ) ? siteId : 'wpcom';
				dispatch( receiveTheme( theme, siteIdOrWpcom ) );
				dispatch( {
					type: ACTIVE_THEME_REQUEST_SUCCESS,
					siteId,
					theme
				} );
			} ).catch( error => {
				dispatch( {
					type: ACTIVE_THEME_REQUEST_FAILURE,
					siteId,
					error,
				} );
			} );
	};
}

/**
 * Triggers a network request to activate a specific theme on a given site.
 * If it's a Jetpack site, installs the theme prior to activation if it isn't already.
 *
 * @param  {String}   themeId   Theme ID
 * @param  {Number}   siteId    Site ID
 * @param  {String}   source    The source that is reuquesting theme activation, e.g. 'showcase'
 * @param  {Boolean}  purchased Whether the theme has been purchased prior to activation
 * @return {Function}           Action thunk
 */
export function activate( themeId, siteId, source = 'unknown', purchased = false ) {
	return ( dispatch, getState ) => {
		if ( isJetpackSite( getState(), siteId ) && ! getTheme( getState(), siteId, themeId ) ) {
			const installId = suffixThemeIdForInstall( getState(), siteId, themeId );
			// If theme is already installed, installation will silently fail,
			// and it will just be activated.
			return dispatch( installAndActivateTheme( installId, siteId, source, purchased ) );
		}

		return dispatch( activateTheme( themeId, siteId, source, purchased ) );
	};
}

/**
 * Triggers a network request to activate a specific theme on a given site.
 *
 * @param  {String}   themeId   Theme ID
 * @param  {Number}   siteId    Site ID
 * @param  {String}   source    The source that is reuquesting theme activation, e.g. 'showcase'
 * @param  {Boolean}  purchased Whether the theme has been purchased prior to activation
 * @return {Function}           Action thunk
 */
export function activateTheme( themeId, siteId, source = 'unknown', purchased = false ) {
	return dispatch => {
		dispatch( {
			type: THEME_ACTIVATE_REQUEST,
			themeId,
			siteId,
		} );

		return wpcom.undocumented().activateTheme( themeId, siteId )
			.then( ( theme ) => {
				// Fall back to ID for Jetpack sites which don't return a stylesheet attr.
				const themeStylesheet = theme.stylesheet || themeId;
				dispatch( themeActivated( themeStylesheet, siteId, source, purchased ) );
			} )
			.catch( error => {
				dispatch( {
					type: THEME_ACTIVATE_REQUEST_FAILURE,
					themeId,
					siteId,
					error,
				} );
			} );
	};
}

/**
 * Returns an action thunk to be used in signalling that a theme has been activated
 * on a given site. Careful, this action is different from most others here in that
 * expects a theme stylesheet string (not just a theme ID).
 *
 * @param  {String}   themeStylesheet Theme stylesheet string (*not* just a theme ID!)
 * @param  {Number}   siteId          Site ID
 * @param  {String}   source          The source that is reuquesting theme activation, e.g. 'showcase'
 * @param  {Boolean}  purchased       Whether the theme has been purchased prior to activation
 * @return {Function}                 Action thunk
 */
export function themeActivated( themeStylesheet, siteId, source = 'unknown', purchased = false ) {
	const themeActivatedThunk = ( dispatch, getState ) => {
		const action = {
			type: THEME_ACTIVATE_REQUEST_SUCCESS,
			themeStylesheet,
			siteId,
		};
		const previousThemeId = getActiveTheme( getState(), siteId );
		const query = getLastThemeQuery( getState(), siteId );

		const trackThemeActivation = recordTracksEvent(
			'calypso_themeshowcase_theme_activate',
			{
				theme: getThemeIdFromStylesheet( themeStylesheet ),
				previous_theme: previousThemeId,
				source: source,
				purchased: purchased,
				search_term: query.search || null
			}
		);
		dispatch( withAnalytics( trackThemeActivation, action ) );
	};
	return themeActivatedThunk; // it is named function just for testing purposes
}

/**
 * Triggers a network request to install a WordPress.org or WordPress.com theme on a Jetpack site.
 * To install a theme from WordPress.com, suffix the theme name with '-wpcom'. Note that this options
 * requires Jetpack 4.4
 *
 * @param  {String}   themeId Theme ID. If suffixed with '-wpcom', install from WordPress.com
 * @param  {String}   siteId  Jetpack Site ID
 * @return {Function}         Action thunk
 */
export function installTheme( themeId, siteId ) {
	return ( dispatch, getState ) => {
		dispatch( {
			type: THEME_INSTALL,
			siteId,
			themeId
		} );

		return wpcom.undocumented().installThemeOnJetpack( siteId, themeId )
			.then( ( theme ) => {
				dispatch( receiveTheme( theme, siteId ) );
				dispatch( {
					type: THEME_INSTALL_SUCCESS,
					siteId,
					themeId
				} );
			} )
			.then( () => {
				if ( endsWith( themeId, '-wpcom' ) ) {
					const parentThemeId = getWpcomParentThemeId(
						getState(),
						themeId.replace( '-wpcom', '' )
					);
					if ( parentThemeId ) {
						dispatch( installTheme( parentThemeId + '-wpcom', siteId ) );
					}
				}
			} )
			.catch( ( error ) => {
				dispatch( {
					type: THEME_INSTALL_FAILURE,
					siteId,
					themeId,
					error
				} );
			} );
	};
}

/**
 * Returns an action object to be used in signalling that theme activated status
 * for site should be cleared
 *
 * @param  {Number}   siteId    Site ID
 * @return {Object}        Action object
 */
export function clearActivated( siteId ) {
	return {
		type: THEME_CLEAR_ACTIVATED,
		siteId
	};
}

/**
 * Switches to the customizer to preview a given theme.
 * If it's a Jetpack site, installs the theme prior to activation if it isn't already.
 *
 * @param  {String}   themeId   Theme ID
 * @param  {Number}   siteId    Site ID
 * @return {Function}           Action thunk
 */
export function tryAndCustomize( themeId, siteId ) {
	return ( dispatch, getState ) => {
		if ( isJetpackSite( getState(), siteId ) && ! getTheme( getState(), siteId, themeId ) ) {
			const installId = suffixThemeIdForInstall( getState(), siteId, themeId );
			// If theme is already installed, installation will silently fail,
			// and we just switch to the customizer.
			return dispatch( installAndTryAndCustomizeTheme( installId, siteId ) );
		}

		return dispatch( tryAndCustomizeTheme( themeId, siteId ) );
	};
}

/**
 * Triggers a network request to install theme on Jetpack site.
 * After installataion it switches page to the customizer
 * See installTheme doc for install options.
 * Requires Jetpack 4.4
 *
 * @param  {String}   themeId      WP.com Theme ID
 * @param  {String}   siteId       Jetpack Site ID
 * @return {Function}              Action thunk
 */
export function installAndTryAndCustomizeTheme( themeId, siteId ) {
	return ( dispatch ) => {
		return dispatch( installTheme( themeId, siteId ) )
			.then( () => {
				dispatch( tryAndCustomizeTheme( themeId, siteId ) );
			} );
	};
}

/**
 * Triggers a switch to the try&customize page of theme.
 * When theme is not available dispatches FAILURE action
 * that trigers displaying error notice by notices middlewaere
 *
 * @param  {String}   themeId      WP.com Theme ID
 * @param  {String}   siteId       Jetpack Site ID
 * @return {Function}              Action thunk
 */
export function tryAndCustomizeTheme( themeId, siteId ) {
	return ( dispatch, getState ) => {
		page( getThemeCustomizeUrl( getState(), themeId, siteId ) );
	};
}

/**
 * Triggers a network request to install and activate a specific theme on a given
 * Jetpack site. If the themeId parameter is suffixed with '-wpcom', install the
 * theme from WordPress.com. Otherwise, install from WordPress.org.
 *
 * @param  {String}   themeId   Theme ID. If suffixed with '-wpcom', install theme from WordPress.com
 * @param  {Number}   siteId    Site ID
 * @param  {String}   source    The source that is reuquesting theme activation, e.g. 'showcase'
 * @param  {Boolean}  purchased Whether the theme has been purchased prior to activation
 * @return {Function}           Action thunk
 */
export function installAndActivateTheme( themeId, siteId, source = 'unknown', purchased = false ) {
	return ( dispatch ) => {
		return dispatch( installTheme( themeId, siteId ) )
			.then( () => {
				// This will be called even if `installTheme` silently fails. We rely on
				// `activateTheme`'s own error handling here.
				dispatch( activateTheme( themeId, siteId, source, purchased ) );
			} );
	};
}

/**
 * Triggers a theme upload to the given site.
 *
 * @param {Number} siteId -- Site to upload to
 * @param {File} file -- the theme zip to upload
 *
 * @return {Function} the action function
 */
export function uploadTheme( siteId, file ) {
	return dispatch => {
		dispatch( {
			type: THEME_UPLOAD_START,
			siteId,
		} );
		return wpcom.undocumented().uploadTheme( siteId, file, ( event ) => {
			dispatch( {
				type: THEME_UPLOAD_PROGRESS,
				siteId,
				loaded: event.loaded,
				total: event.total
			} );
		} )
			.then( ( theme ) => {
				dispatch( receiveTheme( theme, siteId ) );
				dispatch( {
					type: THEME_UPLOAD_SUCCESS,
					siteId,
					themeId: theme.id,
				} );
			} )
			.catch( error => {
				dispatch( {
					type: THEME_UPLOAD_FAILURE,
					siteId,
					error
				} );
			} );
	};
}

/**
 * Clears any state remaining from a previous
 * theme upload to the given site.
 *
 * @param {Number} siteId -- site to clear state for
 *
 * @return {Object} the action object to dispatch
 */
export function clearThemeUpload( siteId ) {
	return {
		type: THEME_UPLOAD_CLEAR,
		siteId,
	};
}

/**
 * Start an Automated Transfer with an uploaded theme.
 *
 * @param {Number} siteId -- the site to transfer
 * @param {File} file -- theme zip to upload
 * @param {String} plugin -- plugin slug
 *
 * @returns {Promise} for testing purposes only
 */
export function initiateThemeTransfer( siteId, file, plugin ) {
	return dispatch => {
		dispatch( {
			type: THEME_TRANSFER_INITIATE_REQUEST,
			siteId,
		} );
		return wpcom.undocumented().initiateTransfer( siteId, plugin, file, ( event ) => {
			dispatch( {
				type: THEME_TRANSFER_INITIATE_PROGRESS,
				siteId,
				loaded: event.loaded,
				total: event.total,
			} );
		} )
			.then( ( { transfer_id } ) => {
				dispatch( {
					type: THEME_TRANSFER_INITIATE_SUCCESS,
					siteId,
					transferId: transfer_id,
				} );
				dispatch( pollThemeTransferStatus( siteId, transfer_id ) );
			} )
			.catch( error => {
				dispatch( {
					type: THEME_TRANSFER_INITIATE_FAILURE,
					siteId,
					error,
				} );
			} );
	};
}

// receive a transfer status
function transferStatus( siteId, transferId, status, message, themeId ) {
	return {
		type: THEME_TRANSFER_STATUS_RECEIVE,
		siteId,
		transferId,
		status,
		message,
		themeId,
	};
}

// receive a transfer status error
function transferStatusFailure( siteId, transferId, error ) {
	return {
		type: THEME_TRANSFER_STATUS_FAILURE,
		siteId,
		transferId,
		error,
	};
}

/**
 * Make API calls to the transfer status endpoint until a status complete is received,
 * or an error is received, or the timeout is reached.
 *
 * The returned promise is only for testing purposes, and therefore is never rejected,
 * to avoid unhandled rejections in production.
 *
 * @param {Number} siteId -- the site being transferred
 * @param {Number} transferId -- the specific transfer
 * @param {Number} [interval] -- time between poll attemps
 * @param {Number} [timeout] -- time to wait for 'complete' status before bailing
 *
 * @return {Promise} for testing purposes only
 */
export function pollThemeTransferStatus( siteId, transferId, interval = 3000, timeout = 180000 ) {
	const endTime = Date.now() + timeout;
	return dispatch => {
		const pollStatus = ( resolve, reject ) => {
			if ( Date.now() > endTime ) {
				// timed-out, stop polling
				dispatch( transferStatusFailure( siteId, transferId, 'client timeout' ) );
				return resolve();
			}
			return wpcom.undocumented().transferStatus( siteId, transferId )
				.then( ( { status, message, uploaded_theme_slug } ) => {
					dispatch( transferStatus( siteId, transferId, status, message, uploaded_theme_slug ) );
					if ( status === 'complete' ) {
						// finished, stop polling
						return resolve();
					}
					// poll again
					return delay( pollStatus, interval, resolve, reject );
				} )
				.catch( ( error ) => {
					dispatch( transferStatusFailure( siteId, transferId, error ) );
					// error, stop polling
					return resolve();
				} );
		};
		return new Promise( pollStatus );
	};
}

/**
 * Deletes a theme from the given Jetpack site.
 *
 * @param {String} themeId -- Theme to delete
 * @param {Number} siteId -- Site to delete theme from
 *
 * @return {Function} Action thunk
 */
export function deleteTheme( themeId, siteId ) {
	return dispatch => {
		dispatch( {
			type: THEME_DELETE,
			themeId,
			siteId,
		} );
		return wpcom.undocumented().deleteThemeFromJetpack( siteId, themeId )
			.then( ( theme ) => {
				dispatch( {
					type: THEME_DELETE_SUCCESS,
					themeId,
					siteId,
					themeName: theme.name,
				} );
			} )
			.catch( error => {
				dispatch( {
					type: THEME_DELETE_FAILURE,
					themeId,
					siteId,
					error
				} );
			} );
	};
}

/**
 * Shows dialog asking user to confirm delete of theme
 * from jetpack site. Deletes theme if user confirms.
 *
 * @param {String} themeId -- Theme to delete
 * @param {Number} siteId -- Site to delete theme from
 *
 * @return {Function} Action thunk
 */
export function confirmDelete( themeId, siteId ) {
	return ( dispatch, getState ) => {
		const { name: themeName } = getTheme( getState(), siteId, themeId );
		const siteTitle = getSiteTitle( getState(), siteId );
		accept(
			i18n.translate(
				'Are you sure you want to delete %(themeName)s from %(siteTitle)s?',
				{ args: { themeName, siteTitle }, comment: 'Themes: theme delete confirmation dialog' }
			),
			( accepted ) => {
				accepted && dispatch( deleteTheme( themeId, siteId ) );
			},
			i18n.translate(
				'Delete %(themeName)s',
				{ args: { themeName }, comment: 'Themes: theme delete dialog confirm button' }
			),
			i18n.translate( 'Back', { context: 'go back (like the back button in a browser)' } )
		);
	};
}

export function setThemePreviewOptions( primary, secondary ) {
	return {
		type: THEME_PREVIEW_OPTIONS,
		primary,
		secondary
	};
}

export function showThemePreview( themeId ) {
	return {
		type: THEME_PREVIEW_STATE,
		themeId
	};
}

export function hideThemePreview() {
	return {
		type: THEME_PREVIEW_STATE,
		themeId: null
	};
}

function suffixThemeIdForInstall( state, siteId, themeId ) {
	// AT sites do not use the -wpcom suffix
	if ( isSiteAutomatedTransfer( state, siteId ) ) {
		return themeId;
	}
	return themeId + '-wpcom';
}
