/**
 * External dependencies
 */
import page from 'page';
import React from 'react';
import { connect } from 'react-redux';
import { includes, find } from 'lodash';

/**
 * Internal dependencies
 */
import Main from 'components/main';
import HeaderCake from 'components/header-cake';
import Card from 'components/card';
import Gridicon from 'components/gridicon';
import FilePicker from 'components/file-picker';
import DropZone from 'components/drop-zone';
import ProgressBar from 'components/progress-bar';
import { localize } from 'i18n-calypso';
import notices from 'notices';
import debugFactory from 'debug';
import { uploadTheme, clearThemeUpload } from 'state/themes/actions';
import { getSelectedSiteId } from 'state/ui/selectors';
import {
	isUploadInProgress,
	isUploadComplete,
	hasUploadFailed,
	getUploadedThemeId,
	getUploadError,
	getUploadProgressTotal,
	getUploadProgressLoaded,
	isInstallInProgress,
} from 'state/themes/upload-theme/selectors';
import { getTheme } from 'state/themes/selectors';

const debug = debugFactory( 'calypso:themes:theme-upload' );

class Upload extends React.Component {

	static propTypes = {
		siteId: React.PropTypes.number,
		inProgress: React.PropTypes.bool,
		complete: React.PropTypes.bool,
		failed: React.PropTypes.bool,
		uploadedTheme: React.PropTypes.object,
		error: React.PropTypes.object,
		progressTotal: React.PropTypes.number,
		progressLoaded: React.PropTypes.number,
		installing: React.PropTypes.bool,
	};

	constructor( props ) {
		super( props );
		const { siteId, inProgress } = this.props;
		! inProgress && this.props.clearThemeUpload( siteId );
	}

	componentWillReceiveProps( nextProps ) {
		if ( nextProps.siteId !== this.props.siteId ) {
			const { siteId, inProgress } = this.props;
			! inProgress && this.props.clearThemeUpload( siteId );
		}
	}

	componentDidUpdate( prevProps ) {
		if ( this.props.complete && ! prevProps.complete ) {
			this.successMessage();
		} else if ( this.props.failed && ! prevProps.failed ) {
			this.failureMessage();
		}
	}

	successMessage() {
		const { translate, uploadedTheme } = this.props;
		notices.success( translate( 'Successfully uploaded theme %(name)s', {
			args: {
				name: uploadedTheme.name
			}
		} ) );
	}

	failureMessage() {
		const { translate, error } = this.props;

		debug( 'Error', error );

		const errorCauses = {
			exists: translate( 'Upload problem: Theme already installed on site.' ),
			'Too Large': translate( 'Upload problem: Zip file too large to upload.' ),
			incompatible: translate( 'Upload problem: Incompatible theme.' ),
		};

		const errorString = JSON.stringify( error );
		const cause = find( errorCauses, ( v, key ) => {
			return includes( errorString, key );
		} );

		notices.error( cause || translate( 'Problem uploading theme' ) );
	}

	onFileSelect = ( files ) => {
		const { translate } = this.props;
		const errorMessage = translate( 'Please drop a single zip file' );

		if ( files.length !== 1 ) {
			notices.error( errorMessage );
			return;
		}

		// DropZone supplies an array, FilePicker supplies a FileList
		const file = files[ 0 ] || files.item( 0 );
		if ( file.type !== 'application/zip' ) {
			notices.error( errorMessage );
			return;
		}
		debug( 'zip file:', file );
		this.props.uploadTheme( this.props.siteId, file );
	}

	renderDropZone() {
		const { translate } = this.props;
		const uploadPromptText = translate(
			'Do you have a custom theme to upload to your site?'
		);
		const uploadInstructionsText = translate(
			"Make sure it's a single zip file, and upload it here."
		);
		const dropText = translate(
			'Drop files or click here to upload'
		);

		return (
			<div>
				<span className="theme-upload__title">{ uploadPromptText }</span>
				<span className="theme-upload__instructions">{ uploadInstructionsText }</span>
				<div className="theme-upload__dropzone">
					<DropZone onFilesDrop={ this.onFileSelect } />
					<FilePicker accept="application/zip" onPick={ this.onFileSelect } >
						<Gridicon
							className="theme-upload__dropzone-icon"
							icon="cloud-upload"
							size={ 48 } />
						{ dropText }
					</FilePicker>
				</div>
			</div>
		);
	}

	renderProgressBar() {
		const {
			translate,
			progressTotal,
			progressLoaded,
			installing,
		} = this.props;

		const uploadingMessage = translate( 'Uploading your theme…' );
		const installingMessage = translate( 'Installing your theme on site…' );

		return (
			<div>
				<span className="theme-upload__title">
					{ installing ? installingMessage : uploadingMessage }
				</span>
				<ProgressBar
					value={ progressLoaded || 0 }
					total={ progressTotal || 100 }
					title={ translate( 'Uploading progress' ) }
					isPulsing={ installing }
				/>
			</div>
		);
	}

	renderTheme() {
		const { uploadedTheme: theme, translate } = this.props;
		return (
			<div className="theme-upload__theme-sheet">
				<span className="theme-upload__theme-name">{ theme.name }</span>
				<span className="theme-upload__author">
					{ translate( 'by ' ) }
					<a href={ theme.author_uri }>{ theme.author }</a>
				</span>
				<img src={ theme.screenshot } />
				<span className="theme-upload__description">{ theme.description }</span>
			</div>
		);
	}

	render() {
		const { translate, inProgress, complete, failed } = this.props;
		return (
			<Main>
				<HeaderCake onClick={ page.back }>{ translate( 'Upload theme' ) }</HeaderCake>
				<Card>
					{ ! inProgress && ! complete && this.renderDropZone() }
					{ inProgress && this.renderProgressBar() }
					{ complete && ! failed && this.renderTheme() }
				</Card>
			</Main>
		);
	}
}

export default connect(
	( state ) => {
		const siteId = getSelectedSiteId( state );
		const themeId = getUploadedThemeId( state, siteId );
		return {
			siteId,
			inProgress: isUploadInProgress( state, siteId ),
			complete: isUploadComplete( state, siteId ),
			failed: hasUploadFailed( state, siteId ),
			uploadedTheme: getTheme( state, siteId, themeId ),
			error: getUploadError( state, siteId ),
			progressTotal: getUploadProgressTotal( state, siteId ),
			progressLoaded: getUploadProgressLoaded( state, siteId ),
			installing: isInstallInProgress( state, siteId ),
		};
	},
	{ uploadTheme, clearThemeUpload },
)( localize( Upload ) );