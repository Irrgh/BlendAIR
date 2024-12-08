
type ResourceAccess = GPUStorageTextureAccess


type BindingInfo = {
    group: number,
    binding: number,
    type: "buffer" | "sampler" | "texture"
}

interface TextureBindingLayout {
    texture?: GPUTextureBindingLayout,
    storageTexture?: GPUStorageTextureBindingLayout,
    externalTexture?: GPUExternalTextureBindingLayout,
}

interface RenderPassColorAttachment {
    /**
     * A {@link RenderGraphResourceHandle} describing the texture subresource that will be output to for this
     * color attachment.
     */
    view: TextureHandle;
    /**
     * Indicates the depth slice index of {@link GPUTextureViewDimension#"3d"} {@link GPURenderPassColorAttachment#view}
     * that will be output to for this color attachment.
     */
    depthSlice?: GPUIntegerCoordinate;
    /**
     * A {@link RenderGraphTextureHandle} describing the texture subresource that will receive the resolved
     * output for this color attachment if {@link GPURenderPassColorAttachment#view} is
     * multisampled.
     */
    resolveTarget?: TextureHandle;
    /**
     * Indicates the value to clear {@link GPURenderPassColorAttachment#view} to prior to executing the
     * render pass. If not map/exist|provided, defaults to `{r: 0, g: 0, b: 0, a: 0}`. Ignored
     * if {@link GPURenderPassColorAttachment#loadOp} is not {@link GPULoadOp#"clear"}.
     * The components of {@link GPURenderPassColorAttachment#clearValue} are all double values.
     * They are converted [$to a texel value of texture format$] matching the render attachment.
     * If conversion fails, a validation error is generated.
     */
    clearValue?: GPUColor;
    /**
     * Indicates the load operation to perform on {@link GPURenderPassColorAttachment#view} prior to
     * executing the render pass.
     * Note: It is recommended to prefer clearing; see {@link GPULoadOp#"clear"} for details.
     */
    loadOp: GPULoadOp;
    /**
     * The store operation to perform on {@link GPURenderPassColorAttachment#view}
     * after executing the render pass.
     */
    storeOp: GPUStoreOp;
}

interface RenderPassDepthStencilAttachment {
    /**
     * A {@link RenderGraphTextureHandle} describing the texture subresource that will be output to
     * and read from for this depth/stencil attachment.
     */
    view: TextureHandle;
    /**
     * Indicates the value to clear {@link GPURenderPassDepthStencilAttachment#view}'s depth component
     * to prior to executing the render pass. Ignored if {@link GPURenderPassDepthStencilAttachment#depthLoadOp}
     * is not {@link GPULoadOp#"clear"}. Must be between 0.0 and 1.0, inclusive.
     * <!-- POSTV1(unrestricted-depth): unless unrestricted depth is enabled -->
     */
    depthClearValue?: number;
    /**
     * Indicates the load operation to perform on {@link GPURenderPassDepthStencilAttachment#view}'s
     * depth component prior to executing the render pass.
     * Note: It is recommended to prefer clearing; see {@link GPULoadOp#"clear"} for details.
     */
    depthLoadOp?: GPULoadOp;
    /**
     * The store operation to perform on {@link GPURenderPassDepthStencilAttachment#view}'s
     * depth component after executing the render pass.
     */
    depthStoreOp?: GPUStoreOp;
    /**
     * Indicates that the depth component of {@link GPURenderPassDepthStencilAttachment#view}
     * is read only.
     */
    depthReadOnly?: boolean;
    /**
     * Indicates the value to clear {@link GPURenderPassDepthStencilAttachment#view}'s stencil component
     * to prior to executing the render pass. Ignored if {@link GPURenderPassDepthStencilAttachment#stencilLoadOp}
     * is not {@link GPULoadOp#"clear"}.
     * The value will be converted to the type of the stencil aspect of `view` by taking the same
     * number of LSBs as the number of bits in the stencil aspect of one texel block|texel of `view`.
     */
    stencilClearValue?: GPUStencilValue;
    /**
     * Indicates the load operation to perform on {@link GPURenderPassDepthStencilAttachment#view}'s
     * stencil component prior to executing the render pass.
     * Note: It is recommended to prefer clearing; see {@link GPULoadOp#"clear"} for details.
     */
    stencilLoadOp?: GPULoadOp;
    /**
     * The store operation to perform on {@link GPURenderPassDepthStencilAttachment#view}'s
     * stencil component after executing the render pass.
     */
    stencilStoreOp?: GPUStoreOp;
    /**
     * Indicates that the stencil component of {@link GPURenderPassDepthStencilAttachment#view}
     * is read only.
     */
    stencilReadOnly?: boolean;
}

/**
 * Uses {@link ColorTargetState} to resolve {@link GPUColorTargetState#format} in {@link RenderGraph}.
 */
interface FragmentState extends GPUShaderModule {
    targets: Iterable<ColorTargetState | null>;
}

/**
 * Mirrors {@link GPUFragmentState} except {@link GPUFragmentState#format} which is omitted
 * and will be resolved in the {@link RenderGraph} from a {@link RenderGraphTextureHandle}.
 */
type ColorTargetState = Omit<GPUColorTargetState, "format">;

/**
 * Mirrors {@link GPUDepthStencilState} except {@link GPUDepthStencilState#format} which is omitted
 * and will be resolved in the {@link RenderGraph} from a {@link RenderGraphTextureHandle}.
 */
type DepthStencilState = Omit<GPUDepthStencilState, "format">;


interface RenderPipelineDescriptor
    extends Omit<GPUPipelineDescriptorBase,"layout"> {
    /**
     * Describes the vertex shader entry point of the pipeline and its input buffer layouts.
     */
    vertex: GPUVertexState;
    /**
     * Describes the primitive-related properties of the pipeline.
     */
    primitive?: GPUPrimitiveState;
    /**
     * Describes the optional depth-stencil properties, including the testing, operations, and bias.
     */
    depthStencil?: DepthStencilState;
    /**
     * Describes the multi-sampling properties of the pipeline.
     */
    multisample?: GPUMultisampleState;
    /**
     * Describes the fragment shader entry point of the pipeline and its output colors. If
     * not map/exist|provided, the [[#no-color-output]] mode is enabled.
     */
    fragment?: FragmentState;
}

interface ComputePipelineDescriptor
  extends Omit<GPUPipelineDescriptorBase,"layout"> {
  /**
   * Describes the compute shader entry point of the pipeline.
   */
  compute: GPUProgrammableStage;
}


type RenderFunc<T> = (enc: GPURenderPassEncoder, passData: T) => void

type ComputeFunc<T> = (enc: GPUComputePassEncoder, passData: T) => void
