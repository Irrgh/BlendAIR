interface Perspective {
    /**
     * Vertical field of view in radians
     */
    fovy:number,
    /**
     * Aspect ratio x / y
     */
    aspect:number,
    /**
     * Near clipping plane distance
     */
    near:number,
    /**
     * Far clipping plane distance
     */
    far:number
}

interface Orthographic {
    scale: number,
    /**
     * Aspect ratio x / y
     */
    aspect: number,
    /**
     * Near clipping plane distance
     */
    near: number,
    /**
     * Far clipping plane distance
     */
    far:number
}

type Projection
    = Perspective
    | Orthographic