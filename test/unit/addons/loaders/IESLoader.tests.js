import { IESLoader } from '../../../../examples/jsm/loaders/IESLoader.js';
import { FloatType, RepeatWrapping } from '../../../../src/Three.js';

// Type C, one plane measured 0-90 deg, linear falloff to zero.
const halfRange = `IESNA:LM-63-2002
TILT=NONE
1 1000 1 3 1 1 2 0 0 0
1 1 1
0 45 90
0
100 50 0
`;

// Type C, two planes: the 0 deg plane throws at 45 deg, the 90 deg plane is dark there.
const asymmetric = `IESNA:LM-63-2002
TILT=NONE
1 1000 1 3 2 1 2 0 0 0
1 1 1
0 45 90
0 90
100 100 0
100 0 0
`;

function parse( text ) {

	const loader = new IESLoader();
	loader.type = FloatType;

	const texture = loader.parse( text );
	const data = texture.image.data;

	return { texture, at: ( inclination, azimuth ) => data[ inclination + azimuth * 180 ] };

}

export default QUnit.module( 'Addons', () => {

	QUnit.module( 'Loaders', () => {

		QUnit.module( 'IESLoader', () => {

			QUnit.test( 'candela is linear and zero outside the measured inclinations', ( assert ) => {

				const { texture, at } = parse( halfRange );

				assert.equal( texture.image.width, 180 );
				assert.equal( texture.image.height, 360 );
				assert.equal( texture.wrapT, RepeatWrapping );

				assert.ok( Math.abs( at( 0, 0 ) - 1 ) < 1e-6, 'peak' );
				assert.ok( Math.abs( at( 45, 0 ) - 0.5 ) < 1e-6, 'linear halfway, not squared' );
				assert.equal( at( 90, 0 ), 0, 'last measured angle' );
				assert.equal( at( 120, 0 ), 0, 'no extrapolation behind the fixture' );
				assert.equal( at( 179, 0 ), 0 );

				let min = Infinity;
				for ( const v of texture.image.data ) min = Math.min( min, v );
				assert.equal( min, 0, 'no negative texels' );

			} );

			QUnit.test( 'asymmetric profiles keep every plane and fold Type C symmetry', ( assert ) => {

				const { texture, at } = parse( asymmetric );

				assert.ok( Math.abs( at( 45, 0 ) - 1 ) < 1e-6, 'measured plane' );
				assert.equal( at( 45, 90 ), 0, 'dark plane' );
				assert.ok( Math.abs( at( 45, 45 ) - 0.5 ) < 1e-6, 'interpolated between planes' );
				assert.ok( Math.abs( at( 45, 180 ) - 1 ) < 1e-6, 'mirrored into the opposite quadrant' );
				assert.equal( at( 45, 270 ), 0 );
				assert.ok( Math.abs( at( 45, 315 ) - 0.5 ) < 1e-6 );

				let nan = false;
				for ( const v of texture.image.data ) if ( Number.isNaN( v ) ) nan = true;
				assert.notOk( nan, 'every azimuth row is written' );

			} );

		} );

	} );

} );
