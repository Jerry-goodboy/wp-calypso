/**
 * External dependencies
 */
import React from 'react';

/**
 * Internal dependencies
 */
import StepWrapper from 'signup/step-wrapper';
import SignupActions from 'lib/signup/actions';
//import analytics from 'lib/analytics';
import Card from 'components/card';

export default React.createClass( {
	displayName: 'DesignType',

	getChoices() {
		return [
			{ type: 'page', label: this.translate( 'Start a new site' ), image: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 310 230"><rect x="15" y="15" fill="#E8F0F5" width="280" height="70"/><rect x="15" y="98" fill="#C3EF96" width="194" height="85"/><rect x="15" y="195" fill="#C3EF96" width="194" height="35"/></svg> },
			{ type: 'domain', label: this.translate( 'Just buy a domain' ), image: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 310 230"><rect fill="#E8F0F5" width="310" height="110"/><rect x="114" y="205" fill="#E8F0F5" width="82" height="25"/><rect x="15" y="205" fill="#E8F0F5" width="82" height="25"/><rect x="213" y="205" fill="#E8F0F5" width="82" height="25"/><rect x="15" y="36" fill="#D2DEE6" width="153" height="13"/><rect x="15" y="59" fill="#D2DEE6" width="113" height="13"/><rect x="15" y="82" fill="#C3EF96" width="30" height="13"/><rect x="15" y="125" fill="#C3EF96" width="280" height="65"/></svg> },
		];
	},

	renderChoice( choice ) {
		return (
			<Card className="design-type__choice" key={ choice.type }>
				<a className="design-type__choice__link" href="#" onClick={ ( event ) => this.handleChoiceClick( event, choice.type ) }>
					{ choice.image }
					<h2>{ choice.label }</h2>
				</a>
			</Card>
		);
	},

	renderChoices() {
		return (
			<div className="design-type__list">
				{ this.getChoices().map( this.renderChoice ) }
			</div>
		);
	},

	render() {
		return (
			<div className="design-type__section-wrapper">
				<StepWrapper
					flowName={ this.props.flowName }
					stepName={ this.props.stepName }
					positionInFlow={ this.props.positionInFlow }
					fallbackHeaderText={ this.props.headerText }
					fallbackSubHeaderText={ this.props.subHeaderText }
					signupProgressStore={ this.props.signupProgressStore }
					stepContent={ this.renderChoices() } />
			</div>
		);
	},

	handleChoiceClick( event, type ) {
		event.preventDefault();
		event.stopPropagation();
		this.handleNextStep( type );
	},

	handleNextStep( designType ) {
		//analytics.tracks.recordEvent( 'calypso_triforce_select_design', { category: designType } );
		if ( designType === 'domain' ) {
			this.props.goToStep( 'user', '' );
		}

		SignupActions.submitSignupStep( { stepName: this.props.stepName }, [], { designType } );
		this.props.goToNextStep();
	}
} );