import { Component, ViewChild, ElementRef, QueryList, ViewChildren } from '@angular/core';
import { NavController, Content, Platform } from 'ionic-angular';

import { DirectLine } from 'botframework-directlinejs';
import { DomSanitizer } from '@angular/platform-browser';

import { TextToSpeech } from '@ionic-native/text-to-speech';
import { SpeechRecognition, SpeechRecognitionListeningOptionsAndroid } from '@ionic-native/speech-recognition';

var directLine = new DirectLine({
  token: 'A3nuyvhrQIc.cwA.Qxc.KV-l8cW2GMsp2ai6mA3u2OWwTNLG-0A837SReesbIxk',
  webSocket: true
});
export class ConversationResult {
  conversationId: string;
  token: string;
  expires_in: number;
  streamUrl: string;
}
export class SendResponse {
  id: string
}

declare var AdaptiveCards;

@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})
export class HomePage {

  //+++++++++++++++++++++++++Bot Conversation Section+++++++++++++++++++++++++//
  speechList: Array<string>;
  androidOptions: SpeechRecognitionListeningOptionsAndroid; ff
  finalText: string;
  isSpeaking: boolean;
  adaptiveCardHtml: any;
  messages: {
    from: string,
    text: string,
    hasAttachments?: boolean,
    contentType?: string,
    timestamp?: string,
    localTimestamp?: string
    cards: {
      type: string,
      title: string,
      value: string
    }[]
  }[];
  isRecording: boolean;
  stack = [];

  @ViewChildren(Content) content: QueryList<Content>;
  auth: ConversationResult = new ConversationResult();
  greetingMessage: string;
  userName = 'Hitesh Tare';
  tabValue = 'My Assistant';
  botContent: Content;
  //+++++++++++++++++++++++++Bot Conversation Section+++++++++++++++++++++++++//

  constructor(public navCtrl: NavController, private sanitizer: DomSanitizer,
    private tts: TextToSpeech, private speech: SpeechRecognition, private platform: Platform) {
    this.messages = [];

    setTimeout(() => {
      this.tabValue = 'My Assistant';
    }, 1000);
  }

  ngOnInit() {
    this.startConversation();

    if ((this.platform.is('android') || this.platform.is('ios')) && !this.platform.is('dom')) {

      this.isSpeechSupported().then(result => {
        if (!result)
          alert('Warning: Speech is not supported on this device and application may not work correctly.');

      });

      //Check if application has permission to microphones
      this.hasPermission().then(result => {
        if (!result)
          this.getPermission();
      })
    }
  }


  public ngAfterViewInit(): void {
    this.content.changes.subscribe((comps: QueryList<Content>) => {
      this.botContent = comps.last;
    });
  }

  transform(style) {
    return this.sanitizer.bypassSecurityTrustHtml(style);
  }

  startConversation() {
    directLine.activity$
      .filter(activity => activity.type === 'message')
      .subscribe(
        message => {
          console.log("Message recieved from bot", message);

          if (message) {
            if (message.from.id !== this.userName) {
              if (message['attachments']) {
                let attachments = message['attachments'][0]; //TODO - this is an array and may contain multiple responses, need to handle it in a betterway - for POC it's okay ;)
                console.log("Message has attachments");
                console.log(attachments);

                if (attachments.contentType == 'application/vnd.microsoft.card.adaptive') {
                  console.log("adaptive cards")
                  this.messages.push({
                    from: message.from.id,
                    text: null,
                    hasAttachments: true,
                    contentType: 'adaptive',
                    cards: null,
                    timestamp: message.timestamp,
                    localTimestamp: message['localTimestamp']
                  });
                  setTimeout(() => {
                    let card = attachments.content;
                    let adaptiveCard = new AdaptiveCards.AdaptiveCard();
                    adaptiveCard.hostConfig = new AdaptiveCards.HostConfig({
                      fontFamily: "Segoe UI, Helvetica Neue, sans-serif"
                    });
                    adaptiveCard.onExecuteAction = (action) => {
                      alert("Ow!");
                      // let adaptiveCard = (action as AdaptiveCards.SubmitAction).data;
                      // console.log((action as AdaptiveCards.SubmitAction).data);
                    }
                    adaptiveCard.parse(card);
                    let renderedCard = adaptiveCard.render();
                    var elementHtml = renderedCard.outerHTML;
                    this.adaptiveCardHtml = this.sanitizer.bypassSecurityTrustHtml(elementHtml)
                    //this.adaptiveCardHtml = elementHtml;
                    //document.getElementById("sample123").appendChild(renderedCard);
                  }, 10);
                  this.scrollToBottom(300);
                }
                else {
                  console.warn('unknown Attachment of activity received');
                  console.warn(attachments.contentType);
                }
              }
              else {
                this.sayText(message['text'].replace(/[**]/g, ""));
                this.messages.push({
                  from: message.from.id,
                  text: message['text'].replace(/[**]/g, ""), //Replace \n with <b> for web version
                  cards: null,
                  timestamp: message.timestamp,
                  localTimestamp: message['localTimestamp']
                });
                this.scrollToBottom(300);
              }
            }
          }
        }
      );
  }

  sendMessage(message: string) {
    try {
      this.finalText = message ? message : this.finalText;

      this.messages.push({
        from: this.userName,
        text: this.finalText,
        cards: null,
      });

      this.scrollToBottom(300);

      directLine.postActivity({
        from: { id: this.userName }, // required (from.name is optional)
        type: 'message',
        text: this.finalText
      }).subscribe(
        (id) => {
          console.log("Message sent to bot ", id);
          this.finalText = '';
        },
        error => console.log("Error posting activity", error)
      );
    } catch (e) {
      console.error(e);
    }
  }



  async hasPermission(): Promise<boolean> {
    try {
      return await this.speech.hasPermission();
    } catch (e) {
      console.log(e);
    }
  }

  async getPermission(): Promise<void> {
    try {
      this.speech.requestPermission();
    } catch (e) {
      console.log(e);
    }
  }

  async isSpeechSupported(): Promise<boolean> {
    try {
      return await this.speech.isRecognitionAvailable();
    } catch (e) {
      return false;
    }
  }

  public isBrowser(): boolean {
    return this.platform.is('mobileweb') || this.platform.is('core');
  }

  scrollToBottom(delay: number): void {
    setTimeout(() => {
      try {
        this.botContent.scrollToBottom(0);
      } catch (err) { }
    }, delay)
  }

  //+++++++++++++++++++++++++Text to Speech+++++++++++++++++++++++++//
  sayText(text: string) {
    if (text) {
      this.stack.push(text);
    }
    let currentMessage;
    if (this.stack.length > 0 && !this.isSpeaking) {
      currentMessage = this.stack[0];
      this.isSpeaking = true;
      this.tts.speak({
        text: currentMessage,
        locale: "en-CA",
        rate: 1.2
      })
        .then(() => {
          console.log("this is for stack value-------" + this.stack.length)
          console.log("CHECK THIS-------" + this.isSpeaking);
          if (this.stack.length == 1) {
            if ((text == "Alright! I'm here to assist you if you need anything. Bye for now!") || (text == "See you soon! Good day ahead") || (text == "Alright! If you need any assistance, you know where to find me... Bye for now!")) {
              this.isRecording = false;
            } else {
              setTimeout(() => {
                var button = document.getElementById("buttonO");
                button.click();
              }, 30);
            }
          }
          this.stack.shift();
          this.isSpeaking = false;
          if (this.stack.length > 0) {
            this.sayText(null);
          }
        })
        .catch((reason: any) => console.log(reason));
    }
  }
  //+++++++++++++++++++++++++Text to Speech+++++++++++++++++++++++++//


  //+++++++++++++++++++++++++Speech Recognition+++++++++++++++++++++++++//
  listenForSpeech(): void {
    this.isRecording = true;
    this.androidOptions = {
      language: "en-CAN"
    };
    this.speech.startListening().subscribe(data => {
      this.speechList = data;
      this.finalText = this.speechList[0];
      this.isRecording = false;
      this.sendMessage(this.finalText);
    }, error => {
      this.isRecording = false;
      console.log(error);
    });
  }
  //+++++++++++++++++++++++++Speech Recognition+++++++++++++++++++++++++//

}
