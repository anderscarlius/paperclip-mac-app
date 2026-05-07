import SwiftUI

struct AppCommands: Commands {
    @Environment(\.openWindow) private var openWindow

    var body: some Commands {
        CommandGroup(replacing: .appInfo) {
            Button("About Paperclip Desktop") {
                openWindow(id: "about")
            }
        }
    }
}
