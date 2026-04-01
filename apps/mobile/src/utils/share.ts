import { Share } from 'react-native';

export async function shareUrl(url: string, title: string) {
  await Share.share({
    title,
    message: `${title}\n${url}`,
    url,
  });
}
