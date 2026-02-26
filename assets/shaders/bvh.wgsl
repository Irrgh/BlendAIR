const eps: f32 = 1e-5;
const max_depth: u32 = 32;

struct Ray {
    origin: vec3<f32>,
    dir: vec3<f32>,
    inv_dir: vec3<f32>
}

struct RayHitInfo {
    world_pos: vec3<f32>,
    length: f32,
    normal: vec3<f32>,
    objectId: u32,
    uv: vec2<f32>,
}

struct BvhNode {
    min: vec3<f32>,
    first_pc: u32,
    max: vec3<f32>,
    prim_count: u32
}

struct Instance {
    blas_node_offset: u32,
    blas_tri_offset: u32,
    blas_vertex_offset: u32,
    transform: mat4x4<f32>,
    inv_transform: mat4x4<f32>,
}

struct Triangle {
    indices: vec3<u32>,
}

fn is_leaf(node: BvhNode) -> bool {
    return node.prim_count > 0u;
}

fn origin_outside_aabb(tmin: vec2<f32>) -> bool {
    return tmin.y >= 0f && tmin.y >= tmin.x;
}

fn origin_inside_aabb(tmin: vec2<f32>) -> bool {
    return tmin.x < 0f && tmin.y >= 0f;
}

fn ray_missed(tmin: vec2<f32>) -> bool {
    return tmin.x < 0f && tmin.y < 0f;
}

fn aabb_hit(t: vec2<f32>) -> bool {
    return t.y >= max(t.x, 0.0);
}

fn aabb_intersection(ray: Ray, bmin: vec3<f32>, bmax: vec3<f32>) -> vec2<f32> {

    var tmin: f32 = 0.0;
    var tmax: f32 = 1e30;
    // WGSL has no literal INFINITY, so use large value

    for (var d: i32 = 0; d < 3; d = d + 1) {

        let origin = ray.origin[d];
        let invdir = ray.inv_dir[d];

        let t1 = (bmin[d] - origin) * invdir;
        let t2 = (bmax[d] - origin) * invdir;

        tmin = min(max(t1, tmin), max(t2, tmin));
        tmax = max(min(t1, tmax), min(t2, tmax));
    }

    return vec2<f32>(tmin, tmax);
}

fn triangle_intersection(ray: Ray, index: u32, vertex_offset: u32) -> RayHitInfo {

    let indices = tris[index].indices + vertex_offset;

    let v0: vec3<f32> = vertices[indices.x];
    let v1: vec3<f32> = vertices[indices.y];
    let v2: vec3<f32> = vertices[indices.z];

    let ab: vec3<f32> = v1 - v0;
    let ac: vec3<f32> = v2 - v0;
    let p: vec3<f32> = cross(ray.dir, ac);
    let det: f32 = dot(ab, p);

    var hitInfo: RayHitInfo = RayHitInfo();
    hitInfo.length = - 1.0f;

    if (abs(det) < eps) {
        return hitInfo;
    }

    let inv_det: f32 = 1.0f / det;
    let t: vec3<f32> = ray.origin - v0;
    let u: f32 = dot(t, p) * inv_det;

    if (u < - eps || u > 1.0 + eps) {
        return hitInfo;
    }

    let q: vec3<f32> = cross(t, ab);
    let v: f32 = dot(ray.dir, q) * inv_det;

    if (v < - eps || u + v > 1.0 + eps) {
        return hitInfo;
    }

    let dist: f32 = dot(ac, q) * inv_det;
    let w: f32 = (1 - u - v);

    let uv0 = uvs[indices.x];
    let uv1 = uvs[indices.y];
    let uv2 = uvs[indices.z];

    hitInfo.length = dist;
    hitInfo.world_pos = v0 * w + v1 * u + v2 * v;
    hitInfo.normal = normalize(cross(ab, ac));
    hitInfo.uv = uv0 * w + uv1 * u + uv2 * v;
    return hitInfo;
}

// Input and Output

@group(0) @binding(0)
var<storage, read> rays: array<Ray>;
@group(0) @binding(1)
var<storage, read_write> hitInfos: array<RayHitInfo>;

// BLAS combined buffer

@group(0) @binding(2)
var<storage, read> bvh_nodes: array<BvhNode>;
@group(0) @binding(3)
var<storage, read> tris: array<Triangle>;
@group(0) @binding(4)
var<storage, read> vertices: array<vec3<f32>>;
@group(0) @binding(5)
var<storage, read> normals: array<vec3<f32>>;
@group(0) @binding(6)
var<storage, read> uvs: array<vec2<f32>>;

// TLAS

@group(0) @binding(7)
var<storage, read> tlas_nodes: array<BvhNode>;
@group(0) @binding(8)
var<storage, read> instances: array<Instance>;

// Other

@group(0) @binding(9)
var<uniform> offset: u32;

fn blas_traversal(ray: Ray, node_offset: u32, tri_offset: u32, vertex_offset: u32) -> RayHitInfo {
    var i_stack: array<u32, max_depth>;
    var d_stack: array<f32, max_depth>;

    var tmin: RayHitInfo = RayHitInfo();
    tmin.length = 1e30f;

    var stack_idx: i32 = 0;
    i_stack[0] = 0u;

    let root: BvhNode = bvh_nodes[node_offset];
    let root_intersection: vec2<f32> = aabb_intersection(ray, root.min, root.max);

    if (aabb_hit(root_intersection)) {
        if (root_intersection.x < 0) {
            d_stack[0] = root_intersection.y;
        }
        else {
            d_stack[0] = root_intersection.x;
        }
    }
    else {
        var miss: RayHitInfo;
        miss.world_pos = vec3f(root_intersection.xy, 0);
        miss.length = - 1.0f;
        return miss;
    }

    while (stack_idx >= 0) {

        if (tmin.length < d_stack[stack_idx]) {
            return tmin;
        }

        let n: BvhNode = bvh_nodes[node_offset + i_stack[stack_idx]];

        if (is_leaf(n)) {
            for (var i: u32 = 0; i < n.prim_count; i++) {
                // checking intersection with all triangles in leaf.
                let tcurr: RayHitInfo = triangle_intersection(ray, tri_offset + n.first_pc + i, vertex_offset);
                if (tcurr.length >= 0 && tcurr.length < tmin.length) {
                    tmin = tcurr;
                }
            }
        }
        else {

            let c1: BvhNode = bvh_nodes[node_offset + n.first_pc];
            let c2: BvhNode = bvh_nodes[node_offset + n.first_pc + 1];

            let t1: vec2<f32> = aabb_intersection(ray, c1.min, c1.max);
            let t2: vec2<f32> = aabb_intersection(ray, c2.min, c2.max);

            // since the ray is always above the max_z it is impossible for the ray origin to be inside a node.
            if (aabb_hit(t1) && aabb_hit(t2)) {

                if (t1.x >= 0 && t2.x >= 0) {
                    if (t1.x > t2.x) {
                        // t2 is closer -> on top of stack
                        i_stack[stack_idx] = n.first_pc;
                        i_stack[stack_idx + 1] = n.first_pc + 1;
                        d_stack[stack_idx] = t1.x;
                        d_stack[stack_idx + 1] = t2.x;
                    }
                    else {
                        // t1 is closer -> on top of stack
                        i_stack[stack_idx] = n.first_pc + 1;
                        i_stack[stack_idx + 1] = n.first_pc;
                        d_stack[stack_idx] = t2.x;
                        d_stack[stack_idx + 1] = t1.x;
                    }
                }
                else if (t1.x < 0 && t2.x < 0) {
                    if (t1.y > t2.y) {
                        i_stack[stack_idx] = n.first_pc + 1;
                        i_stack[stack_idx + 1] = n.first_pc;
                        d_stack[stack_idx] = t1.y;
                        d_stack[stack_idx + 1] = t2.y;
                    }
                    else {
                        i_stack[stack_idx] = n.first_pc;
                        i_stack[stack_idx + 1] = n.first_pc + 1;
                        d_stack[stack_idx] = t2.y;
                        d_stack[stack_idx + 1] = t1.y;
                    }
                }
                else if (t1.x < 0) {
                    i_stack[stack_idx] = n.first_pc;
                    i_stack[stack_idx + 1] = n.first_pc + 1;
                    d_stack[stack_idx] = t1.y;
                    d_stack[stack_idx + 1] = t2.x;
                }
                else if (t2.x < 0) {
                    i_stack[stack_idx] = n.first_pc + 1;
                    i_stack[stack_idx + 1] = n.first_pc;
                    d_stack[stack_idx] = t2.y;
                    d_stack[stack_idx + 1] = t1.x;
                }
                stack_idx += 2;
            }
            else {
                if (aabb_hit(t1)) {
                    i_stack[stack_idx] = n.first_pc;
                    d_stack[stack_idx] = select(t1.y, t1.x, t1.x >= 0);
                    stack_idx++;
                }

                if (aabb_hit(t2)) {
                    i_stack[stack_idx] = n.first_pc + 1;
                    d_stack[stack_idx] = select(t2.y, t2.x, t2.x >= 0);
                    stack_idx++;
                }

            }
        }
        stack_idx--;
    }

    if (tmin.length == 1e30) {
        tmin.length = - 1.0;
    }
    return tmin;
}

fn tlas_traversal(ray: Ray) -> RayHitInfo {
    var bestHit: RayHitInfo = RayHitInfo();
    bestHit.length = 1e30f;
    bestHit.objectId = 0xffffffff;

    var i_stack: array<u32, max_depth>;
    var d_stack: array<f32, max_depth>;

    var stack_idx: i32 = 0;
    i_stack[0] = 0u;

    let root: BvhNode = tlas_nodes[0];
    let root_intersection: vec2<f32> = aabb_intersection(ray, root.min, root.max);

    if (aabb_hit(root_intersection)) {
        if (root_intersection.x < 0) {
            d_stack[0] = root_intersection.y;
        }
        else {
            d_stack[0] = root_intersection.x;
        }
    }
    else {
        var miss: RayHitInfo;
        miss.length = - 1.0f;
        return miss;
    }

    while (stack_idx >= 0) {

        let n: BvhNode = tlas_nodes[i_stack[stack_idx]];

        if (bestHit.length < d_stack[stack_idx]) {
            return bestHit;
        }

        if (is_leaf(n)) {
            for (var i: u32 = 0; i < n.prim_count; i++) {
                let inst = instances[n.first_pc + i];

                // Transform ray into object space
                let obj_origin = (inst.inv_transform * vec4f(ray.origin, 1.0)).xyz;
                let obj_dir = (inst.inv_transform * vec4f(ray.dir, 0.0)).xyz;

                var obj_ray: Ray;
                obj_ray.origin = obj_origin;
                obj_ray.dir = obj_dir;
                obj_ray.inv_dir = 1.0 / obj_dir;

                // Traverse BLAS
                let localHit = blas_traversal(obj_ray, inst.blas_node_offset, inst.blas_tri_offset, inst.blas_vertex_offset);

                if (localHit.length > 0.0) {

                    let object_pos = localHit.world_pos;
                    let object_normal = localHit.normal;

                    // Convert hit back to world space
                    let world_pos = (inst.transform * vec4<f32>(object_pos, 1.0)).xyz;
                    let world_normal = normalize((transpose(inst.inv_transform) * vec4<f32>(object_normal, 0.0)).xyz);
                    let world_t = localHit.length;

                    if (world_t >= 0 && world_t < bestHit.length) {
                        bestHit.world_pos = world_pos;
                        bestHit.normal = world_normal;
                        bestHit.length = world_t;
                        bestHit.objectId = n.first_pc + 1;
                        bestHit.uv = localHit.uv;

                        return bestHit;
                    }
                }
            }
        }
        else {
            let c1: BvhNode = tlas_nodes[n.first_pc];
            let c2: BvhNode = tlas_nodes[n.first_pc + 1];

            let t1: vec2<f32> = aabb_intersection(ray, c1.min, c1.max);
            let t2: vec2<f32> = aabb_intersection(ray, c2.min, c2.max);

            if (aabb_hit(t1) && aabb_hit(t2)) {

                if (t1.x >= 0 && t2.x >= 0) {
                    if (t1.x > t2.x) {
                        // t2 is closer -> on top of stack
                        i_stack[stack_idx] = n.first_pc;
                        i_stack[stack_idx + 1] = n.first_pc + 1;
                        d_stack[stack_idx] = t1.x;
                        d_stack[stack_idx + 1] = t2.x;
                    }
                    else {
                        // t1 is closer -> on top of stack
                        i_stack[stack_idx] = n.first_pc + 1;
                        i_stack[stack_idx + 1] = n.first_pc;
                        d_stack[stack_idx] = t2.x;
                        d_stack[stack_idx + 1] = t1.x;
                    }
                }
                else if (t1.x < 0 && t2.x < 0) {
                    if (t1.y > t2.y) {
                        i_stack[stack_idx] = n.first_pc + 1;
                        i_stack[stack_idx + 1] = n.first_pc;
                        d_stack[stack_idx] = t1.y;
                        d_stack[stack_idx + 1] = t2.y;
                    }
                    else {
                        i_stack[stack_idx] = n.first_pc;
                        i_stack[stack_idx + 1] = n.first_pc + 1;
                        d_stack[stack_idx] = t2.y;
                        d_stack[stack_idx + 1] = t1.y;
                    }
                }
                else if (t1.x < 0) {
                    i_stack[stack_idx] = n.first_pc;
                    i_stack[stack_idx + 1] = n.first_pc + 1;
                    d_stack[stack_idx] = t1.y;
                    d_stack[stack_idx + 1] = t2.x;
                }
                else if (t2.x < 0) {
                    i_stack[stack_idx] = n.first_pc + 1;
                    i_stack[stack_idx + 1] = n.first_pc;
                    d_stack[stack_idx] = t2.y;
                    d_stack[stack_idx + 1] = t1.x;
                }
                stack_idx += 2;
            }
            else {
                if (aabb_hit(t1)) {
                    i_stack[stack_idx] = n.first_pc;
                    d_stack[stack_idx] = select(t1.y, t1.x, t1.x >= 0);
                    stack_idx++;
                }

                if (aabb_hit(t2)) {
                    i_stack[stack_idx] = n.first_pc + 1;
                    d_stack[stack_idx] = select(t2.y, t2.x, t2.x >= 0);
                    stack_idx++;
                }

            }
        }

        stack_idx--;
    }

    if (bestHit.length == 1e30f) {
        bestHit.length = - 1.0f;
    }

    return bestHit;
}

@compute @workgroup_size(32, 1, 1)
fn intersection(@builtin(global_invocation_id) global_id: vec3<u32>) {

    let id: u32 = global_id.x + offset;

    if (id >= arrayLength(&rays)) {
        return;
    }

    let ray: Ray = rays[id];

    hitInfos[id] = tlas_traversal(ray);
}