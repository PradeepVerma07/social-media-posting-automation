import { SocialProvider } from './SocialProvider';
import { MetaInstagramProvider } from './MetaInstagramProvider';
import { MetaFacebookPageProvider } from './MetaFacebookPageProvider';
import { LinkedInOrganizationProvider } from './LinkedInOrganizationProvider';

export class SocialProviderFactory {
  private static providers: Map<string, SocialProvider> = new Map();

  static getProvider(platform: string): SocialProvider {
    const key = platform.toLowerCase();
    if (!this.providers.has(key)) {
      switch (key) {
        case 'instagram':
          this.providers.set(key, new MetaInstagramProvider());
          break;
        case 'facebook':
          this.providers.set(key, new MetaFacebookPageProvider());
          break;
        case 'linkedin':
          this.providers.set(key, new LinkedInOrganizationProvider());
          break;
        default:
          throw new Error(`Unsupported social platform: ${platform}`);
      }
    }
    return this.providers.get(key)!;
  }
}
