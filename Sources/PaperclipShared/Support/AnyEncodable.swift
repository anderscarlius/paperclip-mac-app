public struct AnyEncodable: Encodable {
    private let encodeClosure: (Encoder) throws -> Void

    public init(_ wrapped: Encodable) {
        self.encodeClosure = { encoder in
            try wrapped.encode(to: encoder)
        }
    }

    public func encode(to encoder: Encoder) throws {
        try encodeClosure(encoder)
    }
}
