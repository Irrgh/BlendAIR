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

fn aabb_intersection(ray: Ray, nmin: vec3<f32>, nmax: vec3<f32>) -> vec2<f32> {

    var t: vec2<f32> = vec2<f32>(- 1e30, 1e30);

    let tx1 = (nmin.x - ray.origin.x) * ray.inv_dir.x;
    let tx2 = (nmax.x - ray.origin.x) * ray.inv_dir.x;

    t.x = min(max(tx1, t.x), max(tx2, t.x));
    t.y = max(min(tx1, t.y), min(tx2, t.y));

    let ty1 = (nmin.y - ray.origin.y) * ray.inv_dir.y;
    let ty2 = (nmax.y - ray.origin.y) * ray.inv_dir.y;

    t.x = min(max(ty1, t.x), max(ty2, t.x));
    t.y = max(min(ty1, t.y), min(ty2, t.y));

    let tz1 = (nmin.z - ray.origin.z) * ray.inv_dir.z;
    let tz2 = (nmax.z - ray.origin.z) * ray.inv_dir.z;

    t.x = min(max(tz1, t.x), max(tz2, t.x));
    t.y = max(min(tz1, t.y), min(tz2, t.y));

    return t;
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

    var tmin: RayHitInfo;
    tmin.length = 1e30f;

    var stack_idx: i32 = 0;
    i_stack[0] = 0u;

    let root: BvhNode = bvh_nodes[node_offset];
    let root_intersection: vec2<f32> = aabb_intersection(ray, root.min, root.max);

    if (!ray_missed(root_intersection)) {
        if (origin_inside_aabb(root_intersection)) {
            d_stack[0] = root_intersection.y;
        }
        else {
            d_stack[0] = root_intersection.x;
        }
    }
    else {
        var miss: RayHitInfo;
        miss.length = -123.0f;
        return miss;
    }
    var safety: i32 = 0;
    while (stack_idx >= 0) {
        safety++;

        if (tmin.length <= d_stack[stack_idx]) {
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
            if (!ray_missed(t1) && !ray_missed(t2)) {

                if (origin_outside_aabb(t1) && origin_outside_aabb(t2)) {
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
                    stack_idx = stack_idx + 2;
                }
                else if (origin_inside_aabb(t1) && origin_inside_aabb(t2)) {
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
                else if (origin_inside_aabb(t1)) {
                    i_stack[stack_idx] = n.first_pc;
                    i_stack[stack_idx + 1] = n.first_pc + 1;
                    d_stack[stack_idx] = t1.y;
                    d_stack[stack_idx + 1] = t2.x;
                }
                else if (origin_inside_aabb(t2)) {
                    i_stack[stack_idx] = n.first_pc + 1;
                    i_stack[stack_idx + 1] = n.first_pc;
                    d_stack[stack_idx] = t2.y;
                    d_stack[stack_idx + 1] = t1.x;
                }
                stack_idx += 2;
            }
            else {
                if (!ray_missed(t1)) {
                    i_stack[stack_idx] = n.first_pc;
                    d_stack[stack_idx] = select(t1.y, t1.x, origin_outside_aabb(t1));
                    stack_idx++;
                }

                if (!ray_missed(t2)) {
                    i_stack[stack_idx] = n.first_pc + 1;
                    d_stack[stack_idx] = select(t2.y, t2.x, origin_outside_aabb(t2));
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

fn aabb_hit(t: vec2<f32>) -> bool {
    return t.y >= max(t.x, 0.0);
}

fn tlas_traversal(ray: Ray) -> RayHitInfo {
    var bestHit: RayHitInfo = RayHitInfo();
    bestHit.length = 1e30f;

    var i_stack: array<u32, max_depth>;
    var d_stack: array<f32, max_depth>;

    var stack_idx: i32 = 0;

    let root: BvhNode = tlas_nodes[0];
    let root_intersection = aabb_intersection(ray, root.min, root.max);

    if (!aabb_hit(root_intersection)) {
        bestHit.length = - 1.0;
        return bestHit;
    }

    i_stack[0] = 0u;
    d_stack[0] = root_intersection.x;

    var safety: i32 = 0;
    while (stack_idx >= 0) {
        safety++;
        if (bestHit.length <= d_stack[stack_idx]) {
            stack_idx--;
            continue;
        }

        let n: BvhNode = tlas_nodes[i_stack[stack_idx]];

        if (is_leaf(n)) {

            // Leaf contains instance index
            let instance_index = n.first_pc;
            let inst = instances[instance_index];

            // Transform ray into object space
            let obj_origin = (inst.inv_transform * vec4<f32>(ray.origin, 1.0)).xyz;

            let obj_dir = (inst.inv_transform * vec4<f32>(ray.dir, 0.0)).xyz;

            var obj_ray: Ray;
            obj_ray.origin = obj_origin;
            obj_ray.dir = obj_dir;
            obj_ray.inv_dir = 1.0 / obj_dir;

            // Traverse BLAS
            let localHit = blas_traversal(obj_ray, inst.blas_node_offset, inst.blas_tri_offset, inst.blas_vertex_offset);

            if (localHit.length > 0.0) {

                // Convert hit back to world space
                let world_pos = (inst.transform * vec4<f32>(localHit.world_pos, 1.0)).xyz;

                let world_normal = normalize((transpose(inst.inv_transform) * vec4<f32>(localHit.normal, 0.0)).xyz);

                let world_t = length(world_pos - ray.origin);

                if (world_t < bestHit.length) {
                    bestHit = localHit;
                    bestHit.world_pos = world_pos;
                    bestHit.normal = world_normal;
                    bestHit.length = world_t;
                    bestHit.objectId = instance_index;
                }
            }

            stack_idx--;
            continue;
        }

        // Internal TLAS node
        let c1_index = n.first_pc;
        let c2_index = n.first_pc + 1u;

        let c1 = tlas_nodes[c1_index];
        let c2 = tlas_nodes[c2_index];

        let t1 = aabb_intersection(ray, c1.min, c1.max);
        let t2 = aabb_intersection(ray, c2.min, c2.max);

        stack_idx--;

        if (aabb_hit(t1)) {
            stack_idx++;
            i_stack[stack_idx] = c1_index;
            d_stack[stack_idx] = t1.x;
        }

        if (aabb_hit(t2)) {
            stack_idx++;
            i_stack[stack_idx] = c2_index;
            d_stack[stack_idx] = t2.x;
        }
    }

    //bestHit.world_pos = vec3f(f32(stack_idx), f32(arrayLength(&tlas_nodes)), 3.0);
    //bestHit.objectId = u32(stack_idx);

    if (bestHit.length == 1e30f) {
        bestHit.length = -1.0f;
    }

    //bestHit.objectId = u32(safety + 20);
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