export class Util {
    static randomColor(alpha) {
        return {
            r: Math.random(),
            g: Math.random(),
            b: Math.random(),
            a: alpha
        };
    }
}
