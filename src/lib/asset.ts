export class AssetResolver {
  private static readonly IMAGE_ROOT = "assets/images/";

  private constructor() {
  }

  /**
   * Every project - legacy seed data and anything published through the
   * admin dashboard alike - stores a bare filename (e.g. "lexera.webp")
   * resolved under assets/images/. A value that already contains a "/" is
   * used as-is (for any older entry that still points elsewhere), just
   * prefixed with BASE_URL.
   */
  static resolve(filename: string): string {
    const path = filename.includes("/") ? filename : `${AssetResolver.IMAGE_ROOT}${filename}`;
    return `${import.meta.env.BASE_URL}${path}`;
  }
}
