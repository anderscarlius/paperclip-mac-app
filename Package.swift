// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "PaperclipAppleApps",
    platforms: [
        .macOS(.v14),
        .iOS(.v17)
    ],
    products: [
        .library(
            name: "PaperclipShared",
            targets: ["PaperclipShared"]
        ),
        .library(
            name: "PaperclipMobile",
            targets: ["PaperclipMobile"]
        ),
        .executable(
            name: "PaperclipDesktop",
            targets: ["PaperclipDesktop"]
        )
    ],
    targets: [
        .target(
            name: "PaperclipShared",
            linkerSettings: [
                .linkedFramework("Security")
            ]
        ),
        .target(
            name: "PaperclipMobile",
            dependencies: ["PaperclipShared"],
            linkerSettings: [
                .linkedFramework("Security")
            ]
        ),
        .executableTarget(
            name: "PaperclipDesktop",
            dependencies: ["PaperclipShared"],
            resources: [
                .process("Resources")
            ],
            linkerSettings: [
                .linkedFramework("WebKit"),
                .linkedFramework("Security")
            ]
        ),
        .testTarget(
            name: "PaperclipSharedTests",
            dependencies: ["PaperclipShared"]
        ),
        .testTarget(
            name: "PaperclipDesktopTests",
            dependencies: ["PaperclipDesktop"]
        )
    ]
)
