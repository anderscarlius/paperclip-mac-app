import Foundation

struct PaperclipRuntimeStatus: Equatable {
    let bundledSourceSignature: String
    let installedSourceSignature: String?
    let bundledSourceMetadata: PaperclipSourceMetadata
    let installedSourceMetadata: PaperclipSourceMetadata?

    var isInstalled: Bool {
        installedSourceSignature != nil
    }

    var matchesBundledSnapshot: Bool {
        guard let installedSourceSignature else {
            return false
        }

        return installedSourceSignature == bundledSourceSignature
    }

    var installedRevision: String? {
        installedSourceMetadata?.revision ?? installedSourceSignature
    }

    var bundledSignatureDisplay: String {
        Self.shortSignature(for: bundledSourceMetadata.revision ?? bundledSourceSignature)
    }

    var installedSignatureDisplay: String {
        guard let installedRevision else {
            return "Not installed"
        }

        return Self.shortSignature(for: installedRevision)
    }

    var installedOriginDisplay: String {
        installedSourceMetadata?.origin.title ?? "Unknown"
    }

    var statusSummary: String {
        if !isInstalled {
            return "The bundled Paperclip runtime is ready to install into Application Support."
        }

        if matchesBundledSnapshot {
            return "The installed runtime matches the bundled Paperclip snapshot."
        }

        if installedSourceMetadata?.origin == .upstreamGitHub {
            return "The installed runtime comes from GitHub and differs from the bundled snapshot."
        }

        return "The installed runtime differs from the bundled snapshot."
    }

    var actionTitle: String {
        if !isInstalled {
            return "Install Bundled Runtime"
        }

        if matchesBundledSnapshot {
            return "Reinstall Bundled Runtime"
        }

        return "Install Bundled Snapshot"
    }

    func matchesUpstreamRelease(_ release: PaperclipUpstreamRelease) -> Bool {
        installedRevision == release.revision
    }

    private static func shortSignature(for signature: String) -> String {
        String(signature.prefix(12))
    }
}
