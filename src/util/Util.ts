
export class Util {

    public static randomColor (alpha:number):GPUColorDict {
        return {
            r:Math.random(),
            g:Math.random(),
            b:Math.random(),
            a:alpha
        }

    }

}