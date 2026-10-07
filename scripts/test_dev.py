"""Regression tests for the local launcher's port checks."""
import socket
import unittest

from dev import free_port


class FreePortTest(unittest.TestCase):
    def test_rejects_a_live_server(self):
        with socket.socket() as server:
            server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            server.bind(("127.0.0.1", 0))
            server.listen()
            with self.assertRaisesRegex(RuntimeError, "déjà utilisé"):
                free_port(server.getsockname()[1])

    def test_allows_restart_with_closed_connections(self):
        with socket.socket() as server:
            server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            server.bind(("127.0.0.1", 0))
            port = server.getsockname()[1]
            server.listen()
            with socket.create_connection(("127.0.0.1", port), timeout=2) as client:
                connection, _ = server.accept()
                # Close on the server side first, leaving its port in TIME_WAIT.
                connection.close()
                self.assertEqual(client.recv(1), b"")
        free_port(port)
        # Confirm that a real server can also rebind immediately.
        with socket.socket() as restarted:
            restarted.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            restarted.bind(("127.0.0.1", port))
            restarted.listen()


if __name__ == "__main__":
    unittest.main()
