import dns from 'node:dns';

// Robust DNS resolver to safeguard against local ISP DNS hijacking or poisoning (e.g. 198.98.54.141)
const resolver = new dns.promises.Resolver();
resolver.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);

const origLookup = dns.lookup.bind(dns);

(dns as any).lookup = function (hostname: string, options: any, callback: any) {
  const cb = typeof options === 'function' ? options : callback;
  const opts = typeof options === 'object' ? options : {};

  if (
    typeof hostname === 'string' &&
    (hostname.includes('facebook.com') ||
      hostname.includes('instagram.com') ||
      hostname.includes('fbcdn.net') ||
      hostname.includes('meta.com') ||
      hostname.includes('googleapis.com'))
  ) {
    resolver
      .resolve4(hostname)
      .then(ips => {
        if (ips && ips.length > 0) {
          if (opts.all) {
            cb(null, ips.map(ip => ({ address: ip, family: 4 })));
          } else {
            cb(null, ips[0], 4);
          }
        } else {
          origLookup(hostname, options, callback);
        }
      })
      .catch(() => {
        origLookup(hostname, options, callback);
      });
  } else {
    origLookup(hostname, options, callback);
  }
};
