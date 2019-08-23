import { Component } from '@angular/core';
import { TextToSpeech } from '@ionic-native/text-to-speech';

@Component({
  selector: 'page-contact',
  templateUrl: 'contact.html'
})
export class ContactPage {
  text: string;
  rate: number;
  locale: string;

  constructor(private tts: TextToSpeech) {
    this.text = 'Initial text';
    this.rate = 1;
    this.locale = 'en-US';
  }

  playText() {
    this.tts.speak({
      text: this.text,
      rate: this.rate / 10,
      locale: this.locale
    })
      .then(() => console.log('Success'))
      .catch((reason: any) => console.log(reason));
  }
}

