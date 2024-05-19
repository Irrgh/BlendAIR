
export class Util {

    public static randomColor (alpha:number):GPUColorDict {
        return {
            r:Math.random(),
            g:Math.random(),
            b:Math.random(),
            a:alpha
        }

    }

    public static deepEqual(obj1:any, obj2:any) {
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
      
      public static degreeToRadians (deg:number):number {
        return deg * (Math.PI / 180);
      }

      public static radiansToDegree (radians:number):number {
        return radians * (180 / Math.PI);
      }

}