export class AssetResolver {
  private static readonly IMAGE_ROOT = "assets/images/";

  private constructor() {
  }

  /**
   * Legacy entries store a bare filename (e.g. "lexera.webp") and are
   * resolved under assets/images/. Projects added through the admin
   * dashboard store a full relative path (e.g.
   * "portfolio-uploads/my-project.webp") since uploads live in their
   * own folder - those are used as-is, just prefixed with BASE_URL.
   */
  static resolve(filename: string): string {
    const path = filename.includes("/") ? filename : `${AssetResolver.IMAGE_ROOT}${filename}`;
    return `${import.meta.env.BASE_URL}${path}`;
  }
}
