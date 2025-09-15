/**
 * Copyright 2015, 2016 Ori Livneh <ori@wikimedia.org>
 * Copyright 2022-2025 Universal Omega <universalomega@wikitide.org>
 *
 * Licensed under the Apache License, Version 2.0 ( the "License" );
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';
/* global chrome */

const debug = {
	enabled: false,
	backend: 'test151',

	toggle: ( state ) => {
		debug.enabled = state;
		debug.updateIcon();
		debug.updateDNRRules();
		if ( debug.enabled ) {
			chrome.alarms.create( 'autoOff', { delayInMinutes: 15 } );
		}
	},

	updateIcon: () => {
		if ( debug.enabled ) {
			chrome.action.setBadgeBackgroundColor( { color: '#447ff5' } );
			chrome.action.setBadgeText( { text: 'ON' } );
		} else {
			chrome.action.setBadgeText( { text: '' } );
		}
	},

	getAccessKey: async () => {
		const { accessKey } = await chrome.storage.local.get( [ 'accessKey' ] );
		return accessKey || '';
	},

	buildDNRRules: async () => {
		const accessKey = await debug.getAccessKey();
		return [ {
			id: 1,
			priority: 1,
			action: {
				type: 'modifyHeaders',
				requestHeaders: [
					{
						header: 'X-WikiTide-Debug',
						operation: debug.enabled ? 'set' : 'remove',
						value: debug.enabled ? debug.backend : undefined
					},
					{
						header: 'X-WikiTide-Debug-Access-Key',
						operation: debug.enabled ? 'set' : 'remove',
						value: debug.enabled ? accessKey : undefined
					}
				]
			},
			condition: {
				urlFilter: '*',
				resourceTypes: Object.values( chrome.declarativeNetRequest.ResourceType )
			}
		} ];
	},

	updateDNRRules: async () => {
		const oldRules = await chrome.declarativeNetRequest.getSessionRules();
		const newRules = debug.enabled ? await debug.buildDNRRules() : [];
		await chrome.declarativeNetRequest.updateSessionRules( {
			removeRuleIds: oldRules.map( ( r ) => r.id ),
			addRules: newRules
		} );
	},

	onAlarm: ( alarm ) => {
		if ( alarm.name === 'autoOff' ) {
			debug.toggle( false );
		}
	},

	onMessage: async ( request, sender, sendResponse ) => {
		if ( request.action === 'set' ) {
			debug.toggle( request.enabled );
			debug.backend = request.backend;
		} else if ( request.action === 'get' ) {
			sendResponse( {
				enabled: debug.enabled,
				backend: debug.backend,
				accessKey: await debug.getAccessKey()
			} );
		}
	}
};

chrome.runtime.onMessage.addListener( ( request, sender, sendResponse ) => {
	debug.onMessage( request, sender, sendResponse );
	return true; // keep sendResponse async
} );
chrome.alarms.onAlarm.addListener( debug.onAlarm );
