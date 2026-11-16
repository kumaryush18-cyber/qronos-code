import type { ParentComponent } from "solid-js"
import { IndexingProvider } from "./indexing"
import { QronosEmbeddingModelsProvider } from "./qronos-embedding-models"
import { ImageModelsProvider } from "./image-models"
import { SpeechToTextModelsProvider } from "./speech-to-text-models"
import { NotificationsProvider } from "./notifications"
import { SessionProvider } from "./session"

export const Session: ParentComponent = (props) => (
  <IndexingProvider>
    <QronosEmbeddingModelsProvider>
      <ImageModelsProvider>
        <SpeechToTextModelsProvider>
          <NotificationsProvider>
            <SessionProvider>{props.children}</SessionProvider>
          </NotificationsProvider>
        </SpeechToTextModelsProvider>
      </ImageModelsProvider>
    </QronosEmbeddingModelsProvider>
  </IndexingProvider>
)
