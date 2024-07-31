import { vec2, vec3 } from 'gl-matrix';

export class Util {

  public static randomColor(alpha: number): GPUColorDict {
    return {
      r: Math.random(),
      g: Math.random(),
      b: Math.random(),
      a: alpha
    }

  }

  public static deepEqual(obj1: any, obj2: any) {
    if (typeof obj1 !== 'object' || typeof obj2 !== 'object' || obj1 === null || obj2 === null) {
      return obj1 === obj2;
    }

    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);

    if (keys1.length !== keys2.length) {
      return false;
    }

    for (const key of keys1) {
      if (!obj2.hasOwnProperty(key) || !Util.deepEqual(obj1[key], obj2[key])) {
        return false;
      }
    }

    return true;
  }

  public static degreeToRadians(deg: number): number {
    return deg * (Math.PI / 180);
  }

  public static radiansToDegree(radians: number): number {
    return radians * (180 / Math.PI);
  }





  public static cartesianToSpherical(vec:vec3):SphericalCoordinate {
    // Compute the azimuth (phi)

    let azimuth = Math.atan2(vec[1], vec[0]);
    // Compute the length of the vector (r)
    let r = vec3.len(vec);
    // Compute the elevation (theta)
    let elevation = Math.asin(vec[2] / r);

    return {
      r:r,
      phi: elevation, // in radians
      theta: azimuth // in radians
    };
  }


  public static sphericalToCartesian (vec:SphericalCoordinate):vec3 {
    const x = vec.r * Math.sin(vec.phi) * Math.cos(vec.theta);
    const y = vec.r * Math.sin(vec.phi) * Math.sin(vec.theta);
    const z = vec.r * Math.cos(vec.phi);

    return [x,y,z];
  }

  

}