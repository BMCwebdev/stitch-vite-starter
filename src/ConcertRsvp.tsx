import { useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import {
  Button,
  Heading,
  Radio,
  RadioGroup,
  Select,
  SelectItem,
  Stack,
  TextField,
} from '@bonterratech/stitch-extension';

const styles = stylex.create({
  page: {
    maxWidth: 480,
    marginInline: 'auto',
    padding: 32,
  },
});

export default function ConcertRsvp() {
  const [bringingGuest, setBringingGuest] = useState('no');

  return (
    <div {...stylex.props(styles.page)}>
      <Stack space="600">
        <Heading level={1}>Concert Ticket RSVP</Heading>

        <Select label="Select an event">
          <SelectItem id="lucius">Lucius - Live in Boston</SelectItem>
          <SelectItem id="stealth">Stealth - Acoustic Session</SelectItem>
          <SelectItem id="national">The National - Forest Hills</SelectItem>
        </Select>

        <RadioGroup
          label="Are you bringing a guest?"
          value={bringingGuest}
          onChange={setBringingGuest}
        >
          <Radio value="no">No</Radio>
          <Radio value="yes">Yes</Radio>
        </RadioGroup>

        {bringingGuest === 'yes' && (
          <TextField label="Guest's Full Name" />
        )}

        <Button variant="primary">Submit RSVP</Button>
      </Stack>
    </div>
  );
}
