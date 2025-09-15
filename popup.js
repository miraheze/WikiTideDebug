document.addEventListener( 'DOMContentLoaded', async () => {
	'use strict';
	/* global chrome */

	const $options = Array.from( document.querySelectorAll( '.option' ) );

	const onUpdate = () => {
		const state = { action: 'set-state' };
		$options.forEach( ( $el ) => {
			state[ $el.id ] = $el.checked !== undefined ? $el.checked : $el.value;
		} );

		chrome.runtime.sendMessage( state );
	};

	const getAccessKey = async () => {
		const { accessKey } = await chrome.storage.local.get( [ 'accessKey' ] );
		return accessKey || '';
	};

	// Handling for access key input
	const accessKeyInput = document.getElementById( 'accessKey' );
	accessKeyInput.addEventListener( 'input', () => {
		chrome.storage.local.set( { accessKey: accessKeyInput.value } );
		onUpdate(); // Trigger the update function when the access key changes
	} );

	accessKeyInput.value = await getAccessKey();

	chrome.runtime.sendMessage( { action: 'get-state' }, ( response ) => {
		$options.forEach( async ( $el ) => {
			const value = response[ $el.id ];
			if ( $el.checked !== undefined ) {
				$el.checked = value;
			} else if ( $el.id === 'accessKey' ) {
				$el.value = await getAccessKey();
			} else {
				$el.value = value;
			}

			$el.addEventListener( 'change', onUpdate, false );
		} );

		document.body.className = '';
	} );
} );
