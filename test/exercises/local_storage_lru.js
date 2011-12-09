// copied over from khan-exercise.js

	// window.localStorage is cool, but it has a limited storage. In order
	// to avoid QUOTA_EXCEEDED_ERR exception we should make sure that we
	// don't store too much data. The solution to this is quite simple:
	// let's use a simple abstract LRU structure. The items are stored in
	// localStorage as usual and we add another index xxx_lru_idx, which
	// is an array of keys, ordered by the time of last use. Keys recently
	// used will be closer to the end of that list. When the size of the
	// list gets above threshold - we will remove items from the
	// beginning.
	//
	// The constructor takes:
	//   lru_name - prefix name, in order to enable multiple LRU lists
	//   limit - maximum size of index (ie: max number of elements for this LRU)
	//   upgrade_fun - If the index isn't present yet, we iterate over all the
	//        keys in localStorage and try to create one. This function is called
	//        for every found key. It should return null if the key doesn't belong
	//        to our bucket or a value which will be used to sort items and get
	//        proper initial ordering.
	function LocalStorageLRU( lru_name, limit, upgrade_fun ) {
		var lru_idx_key_name = lru_name + '_lru_idx';

		// Quick wrapper, loads and stores lru_idx.
		var with_lru = function ( fun ) {
			var raw_lru_idx = window.localStorage[ lru_idx_key_name ], lru_idx = [];
			if ( typeof raw_lru_idx !== 'undefined' ) {
				lru_idx = JSON.parse( raw_lru_idx );
			}
			lru_idx = fun( lru_idx );
			window.localStorage[ lru_idx_key_name ] = JSON.stringify( lru_idx );
		}

		var create_index = function() {
			var lru_idx, order = {}; // key --> date
			for ( var i = 0; i < window.localStorage.length; i++ ) {
				var k = window.localStorage.key( i );
				var d = upgrade_fun( k, window.localStorage[ k ] );
				if ( d !== null ) { order[ k ] = d; }
			}
			lru_idx = _.keys(order);
			lru_idx.sort( function ( k1, k2 ) {return order[ k1 ] < order[ k2 ] ? -1 : 1;} );
			return lru_idx;
		}

		var lru = {
			set: function ( key, value ) {
				with_lru( function ( lru_idx ) {
					// localStorage for unknown value returns undefined in all
					// browsers and null in ff.
					if ( !window.localStorage[ lru_idx_key_name ] && upgrade_fun ) {
						// No index present yet and we're given upgrade_fun. Create one.
						lru_idx = create_index();
					}

					// Push key to the end and remove old items;
					lru_idx = _.without( lru_idx, key );
					lru_idx.push( key );
					while ( lru_idx.length > limit ) {
						var k = lru_idx.shift();
						if (k in window.localStorage)
							delete window.localStorage[ k ];
					}
					return lru_idx;
				} );
				window.localStorage[ key ] = value;
			},
			get: function ( key ) {
				with_lru( function ( lru_idx ) {
					if ( _.indexOf( lru_idx, key ) !== -1 ) {
						lru_idx = _.without( lru_idx, key );
						lru_idx.push( key );
					}
					return lru_idx;
				} );
				return window.localStorage[ key ];
			},
			del: function ( key ) {
				with_lru( function( lru_idx ) {
					return _.without( lru_idx, key );
				} );
				if (key in window.localStorage)
					delete window.localStorage[ key ];
			}
		}
		return lru;
	}





var ls = window.localStorage;
// cleanup before running tests. ie doesn't like deleting non-existing elements.
try{
	delete ls[ 'a_lru_idx' ];
	delete ls[ 'b_lru_idx' ];
	delete ls[ 'c_lru_idx' ];
	delete ls[ 'd_lru_idx' ];
}catch(e){};

module('local storage lru');

test('set/del', function() {
	var lru = new LocalStorageLRU( 'b', 4 )

	for(var i = 0; i < 10; i++ ) {
		lru.set( 'b_' + i, '' + i);
	}

	deepEqual( JSON.parse( ls['b_lru_idx'] ), ['b_6', 'b_7', 'b_8', 'b_9'] );

	for(var i = 6; i < 10; i++ ) {
		lru.del( 'b_' + i );
	}

	deepEqual( JSON.parse( ls['b_lru_idx'] ), [] );

	delete ls[ 'b_lru_idx' ];
});


test('get', function() {
	var lru = new LocalStorageLRU( 'c', 4 )

	for(var i = 0; i < 10; i++ ) {
		lru.set( 'c_' + i, '' + i);
	}

	deepEqual( JSON.parse( ls['c_lru_idx'] ), ['c_6', 'c_7', 'c_8', 'c_9'] );

	equal( lru.get( 'c_5' ), undefined );
	for(var i = 6; i < 10; i++ ) {
		equal( lru.get( 'c_' + i ), '' + i );
	}
	equal( lru.get( 'c_11' ), undefined );

	for(var i = 6; i < 10; i++ ) {
		lru.del( 'c_' + i );
	}

	deepEqual( JSON.parse( ls['c_lru_idx'] ), [] );

	delete ls[ 'c_lru_idx' ];
});



test('upgrade function', function() {
	for(var i = 0; i < 11; i++ ) {
		ls[ 'a_' + i ] = '' + i;
	}

	var lru = new LocalStorageLRU( 'a', 4, function (key, value) {
		if ( !/^a_/.test( key ) ) return null;
		return Number( value );
	} );

	lru.set( 'a_11', '11' );

	deepEqual( JSON.parse( ls['a_lru_idx'] ), ['a_8', 'a_9', 'a_10', 'a_11'] );

	for(var i = 8; i < 12; i++ ) {
		lru.del( 'a_' + i );
	}

	deepEqual( JSON.parse( ls['a_lru_idx'] ), [] );

	delete ls[ 'a_lru_idx' ];
});

var sample_lc = {
	'd_exercise:http://nouserid.khanacademy.org/01fc67527cae8bddb162278b710eb4b4:addition_2': '{"last_done": "2011-12-08T15:05:18Z", "first_done": "2011-12-08T15:05:18Z"}',
	'd_exercise:http://nouserid.khanacademy.org/6d9b416f186c98d4a0db66f5dd9220c5:addition_2': '{"last_done": "2011-12-08T15:37:01Z", "first_done": "2011-12-08T15:37:01Z"}',
	'd_exercise:http://nouserid.khanacademy.org/d5d8e0274e86b5d5c585a783531c4331:addition_1': '{"last_done": "2011-12-08T14:52:31Z", "first_done": "2011-12-08T14:52:10Z"}',
	'd_exercise:http://nouserid.khanacademy.org/f5006073676eb69f313703eb0b92f6fc:addition_2': '{"last_done": "2011-12-08T15:29:20Z", "first_done": "2011-12-08T15:29:20Z"}',
	'd_exercise:http://nouserid.khanacademy.org/pre-phantom-user-2:addition_2': '{"last_done": null, "first_done": "2011-08-15T02:35:34Z"}',
	'd_exercise:majek04:addition_1': '{"last_done": "2011-12-08T14:53:34Z", "first_done": "2011-07-18T22:53:45Z"}',
	'd_exercise:majek04:addition_2': '{"last_done": "2011-12-08T15:50:21Z", "first_done": "2011-12-08T14:53:50Z"}',
	'd_exercise:majek04:dependent_probability': '{"last_done": "2011-09-26T21:32:17", "first_done": "2011-09-26T21:12:14"}',
	'd_exercise:majek04:exponent_rules': '{"last_done": null, "first_done": "2011-09-26T21:10:08"}',
	'd_exercise:majek04:fractions_cut_and_copy_1': '{"last_done": "2011-12-05T13:50:17Z", "first_done": "2011-12-05T13:49:07Z"}',
	'd_exercise:majek04:linear_equations_1': '{"last_done": null, "first_done": "2011-09-26T21:11:09"}',
	'd_exercise:majek04:midpoint_formula': '{"last_done": null, "first_done": "2011-12-05T13:33:32Z"}',
	'd_exercise:majek04:multiplication_4': '{"last_done": "2011-12-05T13:48:31Z", "first_done": "2011-12-05T13:48:21Z"}',
	'd_exercise:majek04:parallel_lines_1': '{"last_done": null, "first_done": "2011-12-05T13:48:09Z"}',
	'd_exercise:majek04:telling_time': '{"last_done": "2011-12-05T13:49:00Z", "first_done": "2011-12-05T13:48:41Z"}'
}

test('upgrade ka', function() {
	for ( var k in sample_lc ) {
		ls[ k ] = sample_lc[ k ];
	}

	// Almost the same function as used in khan-exercise.js.
	var upgrade_fun = function ( key, value ) {
		if ( !/^d_exercise/.test( key ) ) return null;
		var data = JSON.parse( value );
		return data.last_done || data.first_done || '1970-01-01T00:00:00Z';
	};

	var lru = new LocalStorageLRU( 'd', 8, upgrade_fun );

	// One needs to set in order to cleanup old entries.
	lru.set( 'd_exercise:majek04:telling_time', 'b' );

	deepEqual( JSON.parse( ls['d_lru_idx'] ), [
		"d_exercise:majek04:fractions_cut_and_copy_1",
		"d_exercise:http://nouserid.khanacademy.org/d5d8e0274e86b5d5c585a783531c4331:addition_1",
		"d_exercise:majek04:addition_1",
		"d_exercise:http://nouserid.khanacademy.org/01fc67527cae8bddb162278b710eb4b4:addition_2",
		"d_exercise:http://nouserid.khanacademy.org/f5006073676eb69f313703eb0b92f6fc:addition_2",
		"d_exercise:http://nouserid.khanacademy.org/6d9b416f186c98d4a0db66f5dd9220c5:addition_2",
		"d_exercise:majek04:addition_2",
		"d_exercise:majek04:telling_time"
	] );

	for ( var k in sample_lc ) {
		lru.del( k );
	}

	deepEqual( JSON.parse( ls['d_lru_idx'] ), [] );

	delete ls[ 'd_lru_idx' ];
});

