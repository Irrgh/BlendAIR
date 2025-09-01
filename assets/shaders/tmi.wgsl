const dir : vec3<f32> = vec3<f32>(0.0,0.0,-1.0);
const inv_dir : vec3<f32> = vec3<f32>(1e35,1e35,-1.0);
const eps : f32 = 1e-5;
const max_depth : u32 = 32;

struct bvh_node {
    min : vec3<f32>,
    first_pc : u32,
    max : vec3<f32>,
    prim_count : u32
}


struct triangle {
    indices : vec3<u32>,
}

fn is_leaf(node : bvh_node) -> bool {
    return node.prim_count > 0u;
}

fn valid_aabb_intersection(tmin : vec2<f32>) -> bool {
    return tmin.y >= 0 && tmin.y >= tmin.x;
}

fn aabb_intersection(nmin : vec3<f32>, nmax : vec3<f32>, org : vec3<f32>) -> vec2<f32> {

    var t : vec2<f32> = vec2<f32>(-1e30,1e30);

    let tx1 = (nmin.x - org.x) * inv_dir.x;
    let tx2 = (nmax.x - org.x) * inv_dir.x;

    t.x = min(max(tx1,t.x),max(tx2,t.x));
    t.y = max(min(tx1,t.y),min(tx2,t.y));

    let ty1 = (nmin.y - org.y) * inv_dir.y;
    let ty2 = (nmax.y - org.y) * inv_dir.y;

    t.x = min(max(ty1,t.x), max(ty2,t.x));
    t.y = max(min(ty1,t.y), min(ty2,t.y));

    let tz1 = (nmin.z - org.z) * inv_dir.z;
    let tz2 = (nmax.z - org.z) * inv_dir.z;

    t.x = min(max(tz1,t.x),max(tz2,t.x));
    t.y = max(min(tz1,t.y),min(tz2,t.y));

    return t;
}


fn triangle_intersection(index : u32, org : vec3<f32>) -> f32 {

    let indices = tris[index].indices;

    let v0 : vec3<f32> = vertices[indices.x];
    let v1 : vec3<f32> = vertices[indices.y];
    let v2 : vec3<f32> = vertices[indices.z];

    let ab : vec3<f32> = v1 - v0;
    let ac : vec3<f32> = v2 - v0;
    let p : vec3<f32>  = cross(dir,ac);
    let det : f32      = dot(ab,p);

    if (abs(det) < eps) {
        return -1.0;
    }

    let inv_det : f32 = 1.0f / det;
    let t : vec3<f32> = org - v0;
    let u : f32 = dot(t,p) * inv_det;

    if (u < -eps || u > 1.0+eps) {
        return -1.0;
    }

    let q : vec3<f32> = cross(t,ab);
    let v : f32 = dot(dir, q) * inv_det;

    if (v < -eps || u + v > 1.0+eps) {
        return -1.0;
    }

    let dist : f32 = dot(ac,q) * inv_det;
    return dist;
}

@group(0) @binding(0) var<storage,read> in_samples : array<vec2<f32>>;
@group(0) @binding(1) var<storage,read_write> out_samples : array<f32>;
@group(0) @binding(2) var<storage,read> nodes : array<bvh_node>;
@group(0) @binding(3) var<storage,read> tris : array<triangle>;
@group(0) @binding(4) var<storage,read> vertices : array<vec3<f32>>;
@group(0) @binding(5) var<uniform> max_z : f32;
@group(0) @binding(6) var<uniform> thread_num : u32;
@group(0) @binding(7) var<storage,read_write> offset : u32;

@compute @workgroup_size(1,1,1)
fn offset_increment(@builtin(global_invocation_id) global_id: vec3<u32>) {
    if (global_id.x == 0u) {
        offset += thread_num;
    }
}


@compute @workgroup_size(32,1,1)
fn intersection (@builtin(global_invocation_id) global_id: vec3<u32>) {

    let id : u32 = global_id.x + offset;
  
    if (id >= arrayLength(&in_samples)) {
        return;
    }

    let org : vec3<f32> = vec3<f32>(in_samples[id],max_z);
    var i_stack : array<u32,max_depth> = array<u32,max_depth>(
        0u, 0u, 0u, 0u, 0u, 0u, 0u, 0u,
        0u, 0u, 0u, 0u, 0u, 0u, 0u, 0u,
        0u, 0u, 0u, 0u, 0u, 0u, 0u, 0u,
        0u, 0u, 0u, 0u, 0u, 0u, 0u, 0u
    );

    var d_stack : array<f32,max_depth> = array<f32,max_depth>(
        0f, 0f, 0f, 0f, 0f, 0f, 0f, 0f,
        0f, 0f, 0f, 0f, 0f, 0f, 0f, 0f,
        0f, 0f, 0f, 0f, 0f, 0f, 0f, 0f,
        0f, 0f, 0f, 0f, 0f, 0f, 0f, 0f
    );

    var tmin : f32 = 1e30f;
    var stack_idx : i32 = 0;

    let root : bvh_node = nodes[0];
    let root_intersection : vec2<f32> = aabb_intersection(root.min,root.max,org);

    if (valid_aabb_intersection(root_intersection)) {
        d_stack[0] = root_intersection.x;   // entry point into aabb is closest
        // root index is already here because initialisation.
    } else {
        out_samples[id] = -1e30;
        return;
    }

    while (stack_idx >= 0) {

        if (tmin <= d_stack[stack_idx]) {
            out_samples[id] = tmin;
            return;
        }

        let n : bvh_node = nodes[i_stack[stack_idx]];

        if (is_leaf(n)) {
            for (var i : u32 = 0; i < n.prim_count; i++) {                   // checking intersection with all triangles in leaf.
                let tcurr : f32 = triangle_intersection(n.first_pc+i,org);
                if (tcurr >= 0 && tcurr < tmin) {
                    tmin = tcurr;
                }
            }
        } else {

            let c1 : bvh_node = nodes[n.first_pc];
            let c2 : bvh_node = nodes[n.first_pc+1];

            let t1 : vec2<f32> = aabb_intersection(c1.min,c1.max,org);
            let t2 : vec2<f32> = aabb_intersection(c2.min,c2.max,org);

            // since the ray is always above the max_z it is impossible for the ray origin to be inside a node.
            if (valid_aabb_intersection(t1) && valid_aabb_intersection(t2)) {
                if (t1.x > t2.x) {                          // t2 is closer -> on top of stack
                    i_stack[stack_idx] = n.first_pc;
                    i_stack[stack_idx+1] = n.first_pc+1;
                    d_stack[stack_idx] = t1.x;
                    d_stack[stack_idx+1] = t2.x;
                } else {                                    // t1 is closer -> on top of stack
                    i_stack[stack_idx] = n.first_pc+1;
                    i_stack[stack_idx+1] = n.first_pc;
                    d_stack[stack_idx] = t2.x;
                    d_stack[stack_idx+1] = t1.x;
                }
                stack_idx = stack_idx + 2;
            } else {
                if (valid_aabb_intersection(t1)) {
                    i_stack[stack_idx] = n.first_pc;
                    d_stack[stack_idx] = t1.x;
                    stack_idx++;
                }
                if (valid_aabb_intersection(t2)) {
                    i_stack[stack_idx] = n.first_pc+1;
                    d_stack[stack_idx] = t2.x;
                    stack_idx++;
                }
            }
        }
        stack_idx--;
    }
    out_samples[id] = tmin;
}