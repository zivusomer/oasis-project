import { JoseModuleContract, JoseProviderContract } from '../interfaces/auth';

export class JoseProvider implements JoseProviderContract {
  private joseModule?: JoseModuleContract;

  public async getJose(): Promise<JoseModuleContract> {
    if (this.joseModule) {
      return this.joseModule;
    }

    const dynamicImport = new Function('specifier', 'return import(specifier)');
    const loaded = await dynamicImport('jose');
    this.joseModule = loaded;
    return loaded;
  }
}
