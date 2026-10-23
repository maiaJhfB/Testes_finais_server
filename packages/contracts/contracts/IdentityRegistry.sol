// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IdentityRegistry
 * @notice Registro de Identidade Autossoberana (SSI) para a Cooperativa de Plataforma
 *
 * @dev Contrato mínimo para registro de DIDs (Decentralized Identifiers) na Polygon.
 *
 * Cada endereço Ethereum é tratado como um DID. O contrato armazena metadados
 * básicos (papel, nome) e emite eventos rastreáveis.
 *
 * Custo estimado de deploy na Polygon: ~0.01 MATIC (~R$ 0,03 em 2025)
 * Custo por registro de usuário: ~0.001 MATIC (~R$ 0,003)
 *
 * Inspirado em: W3C DID Core Spec v1.0 (https://www.w3.org/TR/did-core/)
 * Referência: Nakamoto (2008) — consenso distribuído sem autoridade central
 *
 * @custom:network Polygon Mainnet (chainId: 137)
 *                 Polygon Amoy Testnet (chainId: 80002) para testes
 */
contract IdentityRegistry {

    // ─── Estruturas ──────────────────────────────────────────────────────────

    struct Identity {
        bool registered;
        string metadata;      // JSON: { role, displayName, version }
        uint256 registeredAt;
        uint256 updatedAt;
    }

    // ─── Estado ──────────────────────────────────────────────────────────────

    /// @notice Mapeia endereço Ethereum → Identidade
    mapping(address => Identity) private _identities;

    /// @notice Total de identidades registradas
    uint256 public totalRegistered;

    // ─── Eventos ─────────────────────────────────────────────────────────────

    /// @notice Emitido quando uma nova identidade é registrada
    event Registered(
        address indexed did,
        string metadata,
        uint256 timestamp
    );

    /// @notice Emitido quando uma identidade é atualizada
    event Updated(
        address indexed did,
        string newMetadata,
        uint256 timestamp
    );

    /// @notice Emitido quando uma identidade é removida
    event Deregistered(
        address indexed did,
        uint256 timestamp
    );

    // ─── Erros customizados (mais baratos que require strings) ────────────────

    error AlreadyRegistered();
    error NotRegistered();
    error MetadataTooLong();
    error InvalidMetadata();

    // ─── Modificadores ────────────────────────────────────────────────────────

    modifier onlyRegistered() {
        if (!_identities[msg.sender].registered) revert NotRegistered();
        _;
    }

    modifier onlyUnregistered() {
        if (_identities[msg.sender].registered) revert AlreadyRegistered();
        _;
    }

    // ─── Funções de Escrita ───────────────────────────────────────────────────

    /**
     * @notice Registra o endereço do chamador como um DID na cooperativa.
     * @param did    Endereço Ethereum a registrar (deve ser msg.sender para evitar impersonação)
     * @param metadata JSON string com { role, displayName, version }
     *
     * @dev O parâmetro `did` é mantido por clareza na interface, mas a identidade
     *      registrada é SEMPRE msg.sender (prevenção de impersonação).
     */
    function register(address did, string calldata metadata)
        external
        onlyUnregistered
    {
        // Ignora `did` intencionalmente — sempre usa msg.sender
        _validateMetadata(metadata);

        _identities[msg.sender] = Identity({
            registered: true,
            metadata: metadata,
            registeredAt: block.timestamp,
            updatedAt: block.timestamp
        });

        totalRegistered++;
        emit Registered(msg.sender, metadata, block.timestamp);
    }

    /**
     * @notice Atualiza os metadados de uma identidade já registrada.
     * @param newMetadata JSON string atualizado
     */
    function updateMetadata(string calldata newMetadata)
        external
        onlyRegistered
    {
        _validateMetadata(newMetadata);
        _identities[msg.sender].metadata = newMetadata;
        _identities[msg.sender].updatedAt = block.timestamp;
        emit Updated(msg.sender, newMetadata, block.timestamp);
    }

    /**
     * @notice Remove a própria identidade do registro.
     * @dev Apenas o próprio usuário pode remover sua identidade.
     */
    function deregister() external onlyRegistered {
        delete _identities[msg.sender];
        totalRegistered--;
        emit Deregistered(msg.sender, block.timestamp);
    }

    // ─── Funções de Leitura (gratuitas) ──────────────────────────────────────

    /**
     * @notice Verifica se um endereço está registrado.
     * @param did Endereço a verificar
     */
    function isRegistered(address did) external view returns (bool) {
        return _identities[did].registered;
    }

    /**
     * @notice Retorna os metadados de uma identidade.
     * @param did Endereço a consultar
     */
    function getMetadata(address did)
        external
        view
        returns (string memory)
    {
        if (!_identities[did].registered) revert NotRegistered();
        return _identities[did].metadata;
    }

    /**
     * @notice Retorna a identidade completa de um endereço.
     * @param did Endereço a consultar
     */
    function getIdentity(address did)
        external
        view
        returns (Identity memory)
    {
        if (!_identities[did].registered) revert NotRegistered();
        return _identities[did];
    }

    // ─── Helpers Privados ─────────────────────────────────────────────────────

    function _validateMetadata(string calldata metadata) private pure {
        bytes memory b = bytes(metadata);
        if (b.length == 0) revert InvalidMetadata();
        if (b.length > 512) revert MetadataTooLong(); // máx 512 bytes de metadata
    }
}
