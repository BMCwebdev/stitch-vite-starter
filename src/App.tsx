import * as stylex from '@stylexjs/stylex';
import {
  Button,
  Heading,
  Link,
  Stack,
  Text,
} from '@bonterratech/stitch-extension';

const styles = stylex.create({
  page: {
    maxWidth: 800,
    marginInline: 'auto',
    padding: 32,
  },
});

export default function App() {
  return (
    <div {...stylex.props(styles.page)}>
      <Stack space="600">
        <Heading level={1}>Stitch Vite Starter</Heading>
        <Text variant="lg">
          If you can see this styled text, Stitch and StyleX are working
          correctly.
        </Text>
        <Stack space="400">
          <Heading level={2}>Quick Links</Heading>
          <Link
            href="https://main.d2txqofa7g657p.amplifyapp.com/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Storybook: Component API &amp; Examples
          </Link>
          <Button variant="primary" onPress={() => alert('Stitch is working!')}>
            Click Me
          </Button>
        </Stack>
      </Stack>
    </div>
  );
}
