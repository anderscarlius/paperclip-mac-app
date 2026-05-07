import Foundation

struct OllamaRelease: Equatable {
    let version: String
    let publishedAt: Date?
    let htmlURL: URL?
    let downloadURL: URL

    var shortTitle: String {
        version.hasPrefix("v") ? version : "v\(version)"
    }
}

struct OllamaInstallStatus: Equatable {
    let installedVersion: String?
    let managedAppURL: URL
    let binaryURL: URL?
    let latestRelease: OllamaRelease?
    let isServerReachable: Bool
    let loadedModelCount: Int
    let loadedVRAMBytes: Int64?

    var isInstalled: Bool {
        binaryURL != nil
    }

    var updateAvailable: Bool {
        guard let installedVersion, let latestRelease else { return false }
        return normalize(installedVersion) != normalize(latestRelease.version)
    }

    var installedVersionLabel: String {
        installedVersion ?? "Not installed"
    }

    var latestVersionLabel: String {
        latestRelease?.shortTitle ?? "Not checked yet"
    }

    var installLocationLabel: String {
        managedAppURL.path
    }

    var serverStatusLabel: String {
        guard isServerReachable else { return "Server not running" }
        if loadedModelCount == 0 {
            return "Server running · no models loaded"
        }
        return "Server running · \(loadedModelCount) model\(loadedModelCount == 1 ? "" : "s") loaded"
    }

    private func normalize(_ version: String) -> String {
        version.replacingOccurrences(of: "v", with: "")
    }
}

struct OllamaInstallResult: Equatable {
    let message: String
    let installedVersion: String?
}
