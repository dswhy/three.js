import SpotLightNode from './SpotLightNode.js';
import { texture } from '../accessors/TextureNode.js';
import { cameraViewMatrix } from '../accessors/Camera.js';
import { uniform } from '../core/UniformNode.js';
import { renderGroup } from '../core/UniformGroupNode.js';
import { vec2 } from '../tsl/TSLBase.js';
import { Vector3 } from '../../math/Vector3.js';

const _axis = /*@__PURE__*/ new Vector3();
const _right = /*@__PURE__*/ new Vector3();
const _position = /*@__PURE__*/ new Vector3();

/**
 * An IES version of the default spot light node. Azimuth zero of the IES texture is the
 * light's local X axis, so rotating the light about its beam orients an asymmetric profile.
 *
 * @augments SpotLightNode
 */
class IESSpotLightNode extends SpotLightNode {

	static get type() {

		return 'IESSpotLightNode';

	}

	/**
	 * Constructs a new IES spot light node.
	 *
	 * @param {?IESSpotLight} [light=null] - The spot light source.
	 */
	constructor( light = null ) {

		super( light );

		/**
		 * World-space direction of azimuth 0 (local X projected perpendicular to the beam).
		 *
		 * @type {UniformNode<vec3>}
		 */
		this.rightNode = uniform( new Vector3() ).setGroup( renderGroup );

		/**
		 * World-space direction of azimuth 90 degrees.
		 *
		 * @type {UniformNode<vec3>}
		 */
		this.upNode = uniform( new Vector3() ).setGroup( renderGroup );

		this._iesTextureNode = null;

	}

	update( frame ) {

		super.update( frame );

		const light = this.light;

		_axis.setFromMatrixPosition( light.target.matrixWorld ).sub( light.getWorldPosition( _position ) ).normalize();

		// local X projected perpendicular to the beam; local Y when X is parallel to it

		for ( let column = 0; column < 2; column ++ ) {

			_right.setFromMatrixColumn( light.matrixWorld, column );
			_right.addScaledVector( _axis, - _right.dot( _axis ) );

			if ( _right.lengthSq() > 1e-6 ) break;

		}

		this.rightNode.value.copy( _right.normalize() );
		this.upNode.value.crossVectors( _axis, _right );

		if ( this._iesTextureNode !== null && light.iesMap ) {

			this._iesTextureNode.value = light.iesMap;

		}

	}

	/**
	 * Overwrites the default implementation to compute an IES conform spot attenuation.
	 *
	 * @param {NodeBuilder} builder - The node builder.
	 * @param {Node<float>} angleCosine - The angle to compute the spot attenuation for.
	 * @return {Node<float>} The spot attenuation.
	 */
	getSpotAttenuation( builder, angleCosine ) {

		const iesMap = this.light.iesMap;

		let spotAttenuation = null;

		if ( iesMap && iesMap.isTexture === true ) {

			const toFragment = this.getLightVector( builder ).negate().normalize();
			const right = cameraViewMatrix.transformDirection( this.rightNode );
			const up = cameraViewMatrix.transformDirection( this.upNode );

			// texel i holds the value at i degrees; sample texel centres
			const inclination = angleCosine.acos().mul( 1 / Math.PI ).add( 0.5 / 180 );
			const azimuth = toFragment.dot( up ).atan( toFragment.dot( right ) ).mul( 1 / ( 2 * Math.PI ) ).add( 0.5 / 360 );

			this._iesTextureNode = texture( iesMap, vec2( inclination, azimuth ), 0 );

			spotAttenuation = this._iesTextureNode.r;

		} else {

			spotAttenuation = super.getSpotAttenuation( builder, angleCosine );

		}

		return spotAttenuation;

	}

}

export default IESSpotLightNode;
