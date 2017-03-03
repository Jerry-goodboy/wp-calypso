/**
 * External dependencies
 */
import { expect } from 'chai';

/**
 * Internal dependencies
 */
import { fromApi } from 'state/data-layer/wpcom/read/tags/utils';

const successfulFollowedTagsResponse = {
	tags: [
		{
			ID: '307',
			slug: 'chickens',
			title: 'Chickens',
			display_name: 'chickens',
			URL: 'https://public-api.wordpress.com/rest/v1.2/read/tags/chickens/posts',
		},
		{
			ID: '148',
			slug: 'design',
			title: 'Design',
			display_name: 'design',
			URL: 'https://public-api.wordpress.com/rest/v1.2/read/tags/design/posts',
		},
	]
};

const normalizedFollowedTagsResponse = [
	{
		id: '307',
		slug: 'chickens',
		title: 'Chickens',
		displayName: 'chickens',
		url: '/tag/chickens',
	},
	{
		id: '148',
		slug: 'design',
		title: 'Design',
		displayName: 'design',
		url: '/tag/design',
	},
];

const successfulSingleTagResponse = {
	tag: {
		ID: '307',
		slug: 'chickens',
		title: 'Chickens',
		display_name: 'chickens',
		URL: 'https://public-api.wordpress.com/rest/v1.2/read/tags/chickens/posts'
	},
};

const normalizedSuccessfulSingleTagResponse = [
	{
		id: '307',
		slug: 'chickens',
		title: 'Chickens',
		displayName: 'chickens',
		url: '/tag/chickens',
	},
];

describe( 'wpcom-api: read/tags', () => {
	describe( '#fromApi', () => {
		it( 'should properly normalize response from following tags', () => {
			const transformedResponse = fromApi( successfulFollowedTagsResponse );
			expect( transformedResponse ).to.eql( normalizedFollowedTagsResponse );
		} );

		it( 'should properly normalize a single tag', () => {
			const transformedResponse = fromApi( successfulSingleTagResponse );
			expect( transformedResponse ).to.eql( normalizedSuccessfulSingleTagResponse );
		} );
	} );
} );