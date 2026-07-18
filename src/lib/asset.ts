export class AssetResolver {
  private static readonly IMAGE_ROOT = "assets/images/";

  private constructor() {
  }

  static resolve(filename: string): string {
    return `${import.meta.env.BASE_URL}${AssetResolver.IMAGE_ROOT}${filename}`;
  }
}
