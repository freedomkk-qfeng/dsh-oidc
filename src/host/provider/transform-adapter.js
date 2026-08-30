/** Delegate one enterprise route while applying capabilities contributed by replaceable feature plugins. */
export class TransformingEnterpriseAdapter {
  constructor(inner, transforms, modelPolicy = () => ({})) {
    this.inner = inner
    this.transforms = transforms
    this.modelPolicy = modelPolicy
  }

  providerInfo(provider) { return this.inner.providerInfo(provider) }
  providerRetryPolicy(provider) { return this.inner.providerRetryPolicy(provider) }

  async listModels(provider) {
    const models = await this.inner.listModels(provider)
    return models.map(model => ({
      ...model,
      inputModalities: this.transforms.capabilities(provider, model.id, model.inputModalities),
    }))
  }

  async resolveModel(provider, model, signal) {
    return this.decorateModel(provider, model, await this.inner.resolveModel(provider, model, signal))
  }

  decorateModel(provider, model, resolved) {
    const decorated = {
      ...resolved,
      inputModalities: this.transforms.capabilities(provider, model, resolved.inputModalities),
    }
    const policy = this.modelPolicy(provider, model)
    if (policy.reasoning === false || policy.supportsReasoningEffort !== false) return decorated
    const { reasoning: _unsupportedReasoningEfforts, ...thinkingOnly } = decorated
    return thinkingOnly
  }

  async prepareCall(provider, model, signal) {
    const prepared = typeof this.inner.prepareCall === 'function'
      ? await this.inner.prepareCall(provider, model, signal)
      : { model: await this.inner.resolveModel(provider, model, signal), stream: options => this.inner.stream(options) }
    return {
      model: this.decorateModel(provider, model, prepared.model),
      stream: options => this.streamPrepared(options, prepared),
    }
  }

  async * streamPrepared(options, prepared) {
    const nativeModelInfo = prepared.model
    let request = options
    const policy = this.modelPolicy(options.provider, options.model)
    if (policy.reasoning === false) {
      request = { ...options, reasoningEffort: 'off' }
    } else if (policy.supportsReasoningEffort === false) {
      const { reasoningEffort: _unsupportedReasoningEffort, ...withoutEffort } = options
      request = withoutEffort
    }
    yield* prepared.stream(await this.transforms.apply(request, nativeModelInfo))
  }

  async * stream(options) {
    const prepared = typeof this.inner.prepareCall === 'function'
      ? await this.inner.prepareCall(options.provider, options.model, options.signal)
      : { model: await this.inner.resolveModel(options.provider, options.model, options.signal), stream: request => this.inner.stream(request) }
    yield* this.streamPrepared(options, prepared)
  }
}

