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

  public static bytesPerTexel: { [key in GPUTextureFormat]?: number } = {
    "r8unorm": 1,
    "r8uint": 1,
    "r8sint": 1,
    "r16uint": 2,
    "r16sint": 2,
    "r16float": 2,
    "rg8unorm": 2,
    "rg8uint": 2,
    "rg8sint": 2,
    "r32float": 4,
    "r32uint": 4,
    "r32sint": 4,
    "rgba8unorm": 4,
    "rgba8snorm": 4,
    "rgba8uint": 4,
    "rgba8sint": 4,
    "bgra8unorm": 4,
    "rgb10a2unorm": 4,
    "rg11b10ufloat": 4,
    "rg32float": 8,
    "rg32uint": 8,
    "rg32sint": 8,
    "rgba16float": 8,
    "rgba16uint": 8,
    "rgba16sint": 8,
    "rgba32float": 16,
    "rgba32uint": 16,
    "rgba32sint": 16,
    // Add other formats as necessary
};

}